package com.skillbridge.api;

import com.skillbridge.model.*;
import com.skillbridge.repository.*;
import com.skillbridge.security.JwtService;
import com.skillbridge.service.AiService;
import com.skillbridge.service.PasswordResetService;
import com.skillbridge.service.EmailVerificationService;
import com.skillbridge.service.LoginVerificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.DayOfWeek;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@Transactional
@Validated
public class ApiController {
    private final UserRepository users;
    private final SkillRepository skills;
    private final UserSkillRepository userSkills;
    private final AvailabilitySlotRepository availabilitySlots;
    private final ExchangeRequestRepository requests;
    private final LearningConnectionRepository connections;
    private final ChatMessageRepository messages;
    private final LearningSessionRepository sessions;
    private final LearningProgressRepository progress;
    private final SafetyReportRepository reports;
    private final UserBlockRepository blocks;
    private final NotificationRepository notifications;
    private final ReviewRepository reviews;
    private final ModerationActionRepository moderationActions;
    private final AiConversationRepository aiConversations;
    private final AiMessageRepository aiMessages;
    private final CommunityPostRepository communityPosts;
    private final CommunityCommentRepository communityComments;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AiService aiService;
    private final PasswordResetService passwordResetService;
    private final EmailVerificationService emailVerificationService;
    private final LoginVerificationService loginVerificationService;
    private final boolean emailVerificationRequired;
    @org.springframework.beans.factory.annotation.Value("${skillbridge.demo.seed-enabled:false}")
    private boolean demoSeedEnabled;
    @org.springframework.beans.factory.annotation.Autowired
    private Environment environment;

    public ApiController(UserRepository users, SkillRepository skills, UserSkillRepository userSkills,
                         AvailabilitySlotRepository availabilitySlots,
                         ExchangeRequestRepository requests, LearningConnectionRepository connections,
                         ChatMessageRepository messages, LearningSessionRepository sessions,
                         LearningProgressRepository progress, SafetyReportRepository reports,
                         UserBlockRepository blocks, NotificationRepository notifications, ReviewRepository reviews,
                         ModerationActionRepository moderationActions,
                         AiConversationRepository aiConversations, AiMessageRepository aiMessages,
                         CommunityPostRepository communityPosts, CommunityCommentRepository communityComments,
                         PasswordEncoder passwordEncoder, JwtService jwtService, AiService aiService,
                         PasswordResetService passwordResetService, EmailVerificationService emailVerificationService,
                         LoginVerificationService loginVerificationService,
                         @org.springframework.beans.factory.annotation.Value("${skillbridge.auth.email-verification-required:false}") boolean emailVerificationRequired) {
        this.users = users; this.skills = skills; this.userSkills = userSkills; this.availabilitySlots = availabilitySlots; this.requests = requests;
        this.connections = connections; this.messages = messages; this.sessions = sessions; this.progress = progress;
        this.reports = reports; this.blocks = blocks; this.notifications = notifications; this.reviews = reviews;
        this.moderationActions = moderationActions;
        this.aiConversations = aiConversations; this.aiMessages = aiMessages;
        this.communityPosts = communityPosts; this.communityComments = communityComments;
        this.passwordEncoder = passwordEncoder; this.jwtService = jwtService; this.aiService = aiService;
        this.passwordResetService = passwordResetService;
        this.emailVerificationService = emailVerificationService;
        this.loginVerificationService = loginVerificationService;
        this.emailVerificationRequired = emailVerificationRequired;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        boolean demoMode = demoSeedEnabled && environment.acceptsProfiles(Profiles.of("demo"));
        return Map.of("status", "ok", "demoMode", demoMode);
    }

    @PostMapping("/auth/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest input) {
        if (users.existsByEmailIgnoreCase(input.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account already exists for this email.");
        }
        User user = new User(input.name().trim(), input.email().trim().toLowerCase(Locale.ROOT),
                passwordEncoder.encode(input.password()), trimToNull(input.college()));
        user.setEmailVerified(!emailVerificationRequired);
        user = users.save(user);
        if (emailVerificationRequired) emailVerificationService.sendVerification(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(
                emailVerificationRequired ? "" : jwtService.issue(user), userDto(user), emailVerificationRequired));
    }

    @PostMapping("/auth/login")
    public LoginChallengeResponse login(@Valid @RequestBody LoginRequest input) {
        User user = users.findByEmailIgnoreCase(input.email().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect."));
        if (!passwordEncoder.matches(input.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
        }
        if (emailVerificationRequired && !user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Verify your email before signing in. Check your inbox or request a new verification link.");
        }
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is currently unavailable. Contact support.");
        }
        loginVerificationService.sendCode(user);
        return new LoginChallengeResponse(true,
                "A six-digit sign-in code was sent to your email address. It expires in 10 minutes.");
    }

    @PostMapping("/auth/demo-login")
    public AuthResponse demoLogin() {
        if (!demoSeedEnabled || !environment.acceptsProfiles(Profiles.of("demo"))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Demo sign-in is unavailable.");
        }
        User user = users.findByEmailIgnoreCase("maya@demo.skillbridge.local")
                .filter(candidate -> "ACTIVE".equals(candidate.getStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Demo account is not available. Restart the demo backend to seed sample data."));
        return new AuthResponse(jwtService.issue(user), userDto(user), false);
    }

    @PostMapping("/auth/login/verify")
    public AuthResponse verifyLogin(@Valid @RequestBody LoginVerificationInput input) {
        User user = loginVerificationService.verifyCode(input.email(), input.code());
        return new AuthResponse(jwtService.issue(user), userDto(user), false);
    }

    @PostMapping("/auth/verify-email")
    public Map<String, String> verifyEmail(@Valid @RequestBody EmailVerificationInput input) {
        emailVerificationService.verify(input.token());
        return Map.of("message", "Your email is verified. You can now sign in.");
    }

    @PostMapping("/auth/verify-email/resend")
    public Map<String, String> resendVerification(@Valid @RequestBody PasswordResetRequest input) {
        emailVerificationService.resend(input.email());
        return Map.of("message", "If this account needs verification, a new link was sent or a recent link is still valid.");
    }

    @PostMapping("/auth/password-reset/request")
    public Map<String, String> requestPasswordReset(@Valid @RequestBody PasswordResetRequest input) {
        passwordResetService.requestCode(input.email());
        return Map.of("message", "If an account exists, a reset code was sent or a recent code is still valid. Codes expire after 10 minutes.");
    }

    @PostMapping("/auth/password-reset/confirm")
    public Map<String, String> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmation input) {
        passwordResetService.resetPassword(input.email(), input.code(), input.newPassword());
        return Map.of("message", "Your password has been reset. You can now log in.");
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Void> logout() { return ResponseEntity.noContent().build(); }

    @GetMapping("/auth/me")
    public Map<String, Object> currentUser(org.springframework.security.core.Authentication authentication) {
        return userDto(currentUser(authentication.getName()));
    }

    @GetMapping("/profile")
    public Map<String, Object> getProfile(org.springframework.security.core.Authentication authentication) {
        return userDto(currentUser(authentication.getName()));
    }

    @GetMapping("/users/{id}")
    public Map<String, Object> publicUserProfile(@PathVariable Long id) {
        User user = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found."));
        if (!user.getPrivacySettings().isProfileVisible()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found.");
        Map<String, Object> result = new HashMap<>(userDto(user));
        result.remove("email");
        result.remove("profileMissing");
        result.remove("safetyAcknowledged");
        if (user.getPrivacySettings().isEmailVisible()) result.put("email", user.getEmail());
        if (!user.getPrivacySettings().isPhoneVisible()) result.remove("phone");
        if (!user.getPrivacySettings().isLocationVisible()) result.put("college", "");
        if (!user.getPrivacySettings().isSkillsVisible()) {
            result.put("teachingSkills", "");
            result.put("learningSkills", "");
        }
        if (user.getPrivacySettings().isAvailabilityVisible()) result.put("availability", availabilitySlots.findByUserOrderByDayOfWeekAscStartTimeAsc(user).stream().map(this::availabilityDto).toList());
        result.put("completedSessions", sessions.findAll().stream()
                .filter(session -> "COMPLETED".equals(session.getStatus()))
                .filter(session -> {
                    ExchangeRequest exchange = session.getConnection().getRequest();
                    return exchange.getSender().getId().equals(id) || exchange.getReceiver().getId().equals(id);
                }).count());
        List<Review> userReviews = reviews.findByReviewedUserOrderByCreatedAtDesc(user);
        result.put("averageRating", userReviews.isEmpty() ? null :
                Math.round(userReviews.stream().mapToInt(Review::getRating).average().orElse(0) * 10.0) / 10.0);
        result.put("reviewCount", userReviews.size());
        return result;
    }

    @PutMapping("/profile")
    public Map<String, Object> updateProfile(org.springframework.security.core.Authentication authentication,
                                              @Valid @RequestBody ProfileRequest input) {
        User user = currentUser(authentication.getName());
        user.setName(input.name().trim());
        user.setCollege(trimToNull(input.college()));
        user.setBio(trimToNull(input.bio()));
        if (input.phone() != null) user.setPhone(trimToNull(input.phone()));
        if (input.certifications() != null) user.setCertifications(trimToNull(input.certifications()));
        if (input.safetyAcknowledged() != null) user.setSafetyAcknowledged(input.safetyAcknowledged());
        if (input.teachingSkills() != null || input.learningSkills() != null) {
            userSkills.deleteByUser(user);
            saveSkills(user, input.teachingSkills(), "TEACH");
            saveSkills(user, input.learningSkills(), "LEARN");
        }
        return userDto(users.save(user));
    }

    @GetMapping("/privacy")
    public Map<String, Object> getPrivacy(org.springframework.security.core.Authentication authentication) {
        return privacyDto(currentUser(authentication.getName()).getPrivacySettings());
    }

    @PutMapping("/privacy")
    public Map<String, Object> updatePrivacy(@Valid @RequestBody PrivacyInput input,
                                             org.springframework.security.core.Authentication authentication) {
        User user = currentUser(authentication.getName());
        UserPrivacySettings settings = user.getPrivacySettings();
        if (input.profileVisible() != null) settings.setProfileVisible(input.profileVisible());
        if (input.locationVisible() != null) settings.setLocationVisible(input.locationVisible());
        if (input.emailVisible() != null) settings.setEmailVisible(input.emailVisible());
        if (input.phoneVisible() != null) settings.setPhoneVisible(input.phoneVisible());
        if (input.skillsVisible() != null) settings.setSkillsVisible(input.skillsVisible());
        if (input.availabilityVisible() != null) settings.setAvailabilityVisible(input.availabilityVisible());
        if (input.allowExchangeRequests() != null) settings.setAllowExchangeRequests(input.allowExchangeRequests());
        if (input.allowMessages() != null) settings.setAllowMessages(input.allowMessages());
        users.save(user);
        return privacyDto(settings);
    }

    private Map<String, Object> availabilityDto(AvailabilitySlot slot) {
        return Map.of("id", slot.getId(), "dayOfWeek", slot.getDayOfWeek(), "startTime", slot.getStartTime(),
                "endTime", slot.getEndTime(), "timeZone", slot.getTimeZone(), "mode", slot.getMode(),
                "preferredDurationMinutes", slot.getPreferredDurationMinutes());
    }

    @GetMapping("/availability")
    public List<Map<String, Object>> getAvailability(org.springframework.security.core.Authentication authentication) {
        return availabilitySlots.findByUserOrderByDayOfWeekAscStartTimeAsc(currentUser(authentication.getName())).stream()
                .map(this::availabilityDto).toList();
    }

    @PutMapping("/availability")
    public List<Map<String, Object>> replaceAvailability(@Valid @RequestBody AvailabilityInput input,
            org.springframework.security.core.Authentication authentication) {
        User user = currentUser(authentication.getName());
        if (input.slots() == null || input.slots().size() > 42)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide up to 42 weekly availability slots.");
        List<AvailabilitySlot> replacements = new ArrayList<>();
        for (AvailabilitySlotInput slot : input.slots()) {
            if (slot.dayOfWeek() < 1 || slot.dayOfWeek() > 7 || !slot.endTime().isAfter(slot.startTime()))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid weekday and a time range that ends after it starts.");
            if (slot.preferredDurationMinutes() < 15 || slot.preferredDurationMinutes() > 240)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preferred session duration must be 15 to 240 minutes.");
            if (!Set.of("ONLINE", "OFFLINE", "BOTH").contains(slot.mode()))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose Online, Offline, or Both for each slot.");
            try { ZoneId.of(slot.timeZone()); } catch (Exception ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid time zone."); }
            replacements.add(new AvailabilitySlot(user, slot.dayOfWeek(), slot.startTime(), slot.endTime(), slot.timeZone(), slot.mode(), slot.preferredDurationMinutes()));
        }
        availabilitySlots.deleteByUser(user);
        availabilitySlots.saveAll(replacements);
        return availabilitySlots.findByUserOrderByDayOfWeekAscStartTimeAsc(user).stream().map(this::availabilityDto).toList();
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(org.springframework.security.core.Authentication authentication) {
        User user = currentUser(authentication.getName());
        List<UserSkill> ownedSkills = userSkills.findByUser(user);
        List<ExchangeRequest> userRequests = requests.findBySenderOrReceiverOrderByCreatedAtDesc(user, user);
        List<LearningConnection> userConnections = connections.findByRequestSenderOrRequestReceiver(user, user);
        long active = userConnections.stream().filter(item -> Set.of("ACTIVE", "PAUSED").contains(item.getStatus())).count();
        List<LearningSession> userSessions = userConnections.isEmpty() ? List.of() : sessions.findByConnectionInOrderByDateAsc(userConnections);
        long completedSessions = userSessions.stream().filter(item -> "COMPLETED".equals(item.getStatus())).count();
        List<LearningSession> plannedSessions = userSessions.stream()
                .filter(item -> Set.of("PENDING_CONFIRMATION", "UPCOMING", "IN_PROGRESS", "COMPLETION_PENDING").contains(item.getStatus())
                        && !item.getDate().isBefore(LocalDate.now()))
                .toList();
        List<Map<String, Object>> upcoming = plannedSessions.stream()
                .limit(5).map(item -> Map.<String, Object>of("id", item.getId(), "title", item.getTitle(),
                        "skillName", item.getSkillName(), "date", item.getDate(), "startTime", item.getStartTime(),
                        "endTime", item.getEndTime(), "status", item.getStatus(),
                        "partnerName", otherParty(item.getConnection(), user).getName()))
                .toList();
        boolean hasSkills = !ownedSkills.isEmpty();
        Set<String> myTeaching = skillNames(ownedSkills, "TEACH");
        Set<String> myLearning = skillNames(ownedSkills, "LEARN");
        boolean hasMatch = hasSkills && users.findAll().stream().filter(person -> !person.getId().equals(user.getId()))
                .filter(person -> !blocks.existsByBlockerAndBlocked(user, person) && !blocks.existsByBlockerAndBlocked(person, user))
                .anyMatch(person -> matchCard(user, person, myTeaching, myLearning) != null);
        List<String> teachingSkillNames = ownedSkills.stream().filter(item -> "TEACH".equals(item.getType()))
                .map(item -> item.getSkill().getName()).distinct().sorted().toList();
        List<String> learningSkillNames = ownedSkills.stream().filter(item -> "LEARN".equals(item.getType()))
                .map(item -> item.getSkill().getName()).distinct().sorted().toList();
        return Map.of("teachingSkills", ownedSkills.stream().filter(item -> "TEACH".equals(item.getType())).count(),
                "learningSkills", ownedSkills.stream().filter(item -> "LEARN".equals(item.getType())).count(),
                "teachingSkillNames", teachingSkillNames, "learningSkillNames", learningSkillNames,
                "activeExchanges", active, "completedSessions", completedSessions,
                "plannedSessions", plannedSessions.size(),
                "hasSkills", hasSkills, "hasMatch", hasMatch, "upcomingSessions", upcoming);
    }

    @GetMapping("/skills")
    public List<Map<String, Object>> skillCatalog(@RequestParam(required = false) String query) {
        return skills.findAll().stream()
                .filter(skill -> query == null || query.isBlank() || skill.getName().toLowerCase(Locale.ROOT).contains(query.trim().toLowerCase(Locale.ROOT)))
                .map(skill -> Map.<String, Object>of("id", skill.getId(), "name", skill.getName(), "category", skill.getCategory()))
                .toList();
    }

    @GetMapping("/conversations")
    public List<Map<String, Object>> conversations(org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        return connections.findByRequestSenderOrRequestReceiver(me, me).stream()
                .filter(connection -> !isBlockedWith(connection, me))
                .map(connection -> {
            User other = otherParty(connection, me);
            List<ChatMessage> recent = messages.findByConnectionOrderByCreatedAtAsc(connection);
            ChatMessage latest = recent.isEmpty() ? null : recent.get(recent.size() - 1);
            Map<String, Object> item = new HashMap<>();
            item.put("id", connection.getId());
            item.put("requestId", connection.getRequest().getId());
            item.put("status", connection.getStatus());
            item.put("otherUserName", other.getName());
            item.put("lastMessage", latest == null ? "" : latest.getMessage());
            item.put("updatedAt", latest == null ? connection.getRequest().getCreatedAt() : latest.getCreatedAt());
            item.put("unreadCount", recent.stream().filter(message -> !message.getSender().getId().equals(me.getId()) && !message.isRead()).count());
            return item;
        }).sorted(Comparator.comparing(item -> (Instant) item.get("updatedAt"), Comparator.reverseOrder())).toList();
    }

    @GetMapping("/connections")
    public List<Map<String, Object>> userConnections(org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        return connections.findByRequestSenderOrRequestReceiver(me, me).stream()
                .filter(connection -> !isBlockedWith(connection, me))
                .map(connection -> Map.<String, Object>of(
                        "id", connection.getId(),
                        "requestId", connection.getRequest().getId(),
                        "otherUserName", otherParty(connection, me).getName(),
                        "status", connection.getStatus()))
                .toList();
    }

    @PatchMapping("/connections/{id}")
    public Map<String, Object> updateConnection(@PathVariable Long id, @Valid @RequestBody ConnectionStatusInput input,
                                                org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        LearningConnection connection = connectionFor(id, me);
        String nextStatus = input.status();
        if (isBlockedWith(connection, me)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This exchange is unavailable.");
        }
        if ("COMPLETED".equals(nextStatus)) {
            List<LearningSession> exchangeSessions = sessions.findByConnectionInOrderByDateAsc(List.of(connection));
            List<LearningSession> activeSessions = exchangeSessions.stream()
                    .filter(session -> !"CANCELLED".equals(session.getStatus())).toList();
            if (activeSessions.isEmpty() || activeSessions.stream().anyMatch(session -> !"COMPLETED".equals(session.getStatus()))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Complete all scheduled sessions with both participants before closing this exchange.");
            }
        }
        try {
            connection.transitionTo(nextStatus);
        } catch (IllegalStateException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, error.getMessage());
        }
        notifications.save(new Notification(otherParty(connection, me), "EXCHANGE_STATUS", "Your exchange was updated",
                "The exchange is now " + nextStatus.toLowerCase(Locale.ROOT) + "."));
        return Map.of("id", connection.getId(), "status", connection.getStatus());
    }

    @GetMapping("/matches")
    public Map<String, Object> matches(org.springframework.security.core.Authentication authentication,
                                              @RequestParam(required = false) String query,
                                              @RequestParam(required = false) String category,
                                              @RequestParam(required = false) String teaches,
                                              @RequestParam(required = false) String learns,
                                              @RequestParam(required = false) @Min(1) @Max(7) Integer dayOfWeek,
                                              @RequestParam(defaultValue = "0") @Min(0) int page,
                                              @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size,
                                              @RequestParam(defaultValue = "match") String sort) {
        User me = currentUser(authentication.getName());
        List<UserSkill> own = userSkills.findByUser(me);
        Set<String> myTeaching = skillNames(own, "TEACH");
        Set<String> myLearning = skillNames(own, "LEARN");
        if (myTeaching.isEmpty() && myLearning.isEmpty()) return Map.of("items", List.of(), "page", page,
                "size", size, "totalItems", 0, "totalPages", 0);
        List<Map<String, Object>> found = users.findAll().stream().filter(person -> !person.getId().equals(me.getId()))
                .filter(person -> person.getPrivacySettings().isProfileVisible() && person.getPrivacySettings().isSkillsVisible())
                .filter(person -> !blocks.existsByBlockerAndBlocked(me, person) && !blocks.existsByBlockerAndBlocked(person, me))
                .filter(person -> dayOfWeek == null || (person.getPrivacySettings().isAvailabilityVisible()
                        && availabilitySlots.findByUserOrderByDayOfWeekAscStartTimeAsc(person).stream().anyMatch(slot -> slot.getDayOfWeek() == dayOfWeek)))
                .map(person -> matchCard(me, person, myTeaching, myLearning))
                .filter(Objects::nonNull)
                .filter(card -> query == null || query.isBlank() || searchable(card).contains(query.trim().toLowerCase(Locale.ROOT)))
                .filter(card -> category == null || category.isBlank() || card.get("category").toString().equalsIgnoreCase(category))
                .filter(card -> teaches == null || teaches.isBlank() || ((List<?>) card.get("teaches")).stream().anyMatch(skill -> skill.toString().toLowerCase(Locale.ROOT).contains(teaches.trim().toLowerCase(Locale.ROOT))))
                .filter(card -> learns == null || learns.isBlank() || ((List<?>) card.get("learns")).stream().anyMatch(skill -> skill.toString().toLowerCase(Locale.ROOT).contains(learns.trim().toLowerCase(Locale.ROOT))))
                .sorted(switch (sort.toLowerCase(Locale.ROOT)) {
                    case "name" -> Comparator.comparing(card -> card.get("name").toString(), String.CASE_INSENSITIVE_ORDER);
                    default -> Comparator.comparingInt((Map<String, Object> card) -> -((Number) card.get("matchScore")).intValue());
                }).toList();
        int from = (int) Math.min((long) page * size, found.size());
        int to = Math.min(from + size, found.size());
        return Map.of("items", found.subList(from, to), "page", page, "size", size,
                "totalItems", found.size(), "totalPages", (int) Math.ceil(found.size() / (double) size));
    }

    @PostMapping("/exchange-requests")
    public ResponseEntity<Map<String, Object>> createRequest(org.springframework.security.core.Authentication authentication,
                                                             @Valid @RequestBody ExchangeInput input) {
        User sender = currentUser(authentication.getName());
        User receiver = users.findById(input.receiverId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "That profile could not be found."));
        if (sender.getId().equals(receiver.getId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot send an exchange request to yourself.");
        if (blocks.existsByBlockerAndBlocked(sender, receiver) || blocks.existsByBlockerAndBlocked(receiver, sender)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This connection is unavailable.");
        }
        if (!receiver.getPrivacySettings().isAllowExchangeRequests()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This member is not accepting exchange requests.");
        }
        boolean duplicate = java.util.stream.Stream.concat(
                        requests.findBySenderAndReceiver(sender, receiver).stream(),
                        requests.findBySenderAndReceiver(receiver, sender).stream())
                .anyMatch(existing -> "PENDING".equals(existing.getStatus())
                        || ("ACCEPTED".equals(existing.getStatus())
                        && connections.findByRequest(existing).map(connection -> !"COMPLETED".equals(connection.getStatus())).orElse(true)));
        if (duplicate) throw new ResponseStatusException(HttpStatus.CONFLICT, "An active exchange request already exists between you.");
        ExchangeRequest saved = requests.save(new ExchangeRequest(sender, receiver, trimToNull(input.message())));
        notifications.save(new Notification(receiver, "EXCHANGE_REQUEST", "A new skill exchange request",
                sender.getName() + " would like to learn and share skills with you."));
        return ResponseEntity.status(HttpStatus.CREATED).body(requestDto(saved, sender));
    }

    @GetMapping("/exchange-requests")
    public List<Map<String, Object>> exchangeRequests(org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        return requests.findBySenderOrReceiverOrderByCreatedAtDesc(me, me).stream().map(request -> requestDto(request, me)).toList();
    }

    @PutMapping("/exchange-requests/{id}/accept")
    public Map<String, Object> acceptRequest(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        return respondToRequest(id, currentUser(authentication.getName()), "ACCEPTED");
    }

    @PutMapping("/exchange-requests/{id}/reject")
    public Map<String, Object> rejectRequest(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        return respondToRequest(id, currentUser(authentication.getName()), "REJECTED");
    }

    @DeleteMapping("/exchange-requests/{id}")
    public ResponseEntity<Void> cancelRequest(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        ExchangeRequest request = requests.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found."));
        if (!request.getSender().getId().equals(me.getId()) || !"PENDING".equals(request.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can cancel a pending request.");
        }
        request.cancel();
        notifications.save(new Notification(request.getReceiver(), "EXCHANGE_CANCELLED", "An exchange request was cancelled",
                me.getName() + " cancelled their pending request."));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/messages")
    public List<Map<String, Object>> conversationMessages(org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        List<LearningConnection> mine = connections.findByRequestSenderOrRequestReceiver(me, me);
        if (mine.isEmpty()) return List.of();
        return mine.stream().filter(connection -> !isBlockedWith(connection, me))
                .flatMap(connection -> messages.findByConnectionOrderByCreatedAtAsc(connection).stream()
                        .map(message -> Map.<String, Object>of("id", message.getId(), "connectionId", connection.getId(),
                                "otherUserName", otherParty(connection, me).getName(), "message", message.getMessage(),
                                "createdAt", message.getCreatedAt(), "mine", message.getSender().getId().equals(me.getId()),
                                "read", message.isRead())))
                .sorted(Comparator.comparing(item -> (Instant) item.get("createdAt")))
                .toList();
    }

    @PutMapping("/conversations/{id}/read")
    public ResponseEntity<Void> markConversationRead(@PathVariable Long id,
                                                      org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        LearningConnection connection = connectionFor(id, me);
        if (isBlockedWith(connection, me)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This conversation is unavailable.");
        messages.findByConnectionOrderByCreatedAtAsc(connection).stream()
                .filter(message -> !message.getSender().getId().equals(me.getId()))
                .forEach(ChatMessage::markRead);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/messages")
    public ResponseEntity<Map<String, Object>> sendMessage(org.springframework.security.core.Authentication authentication,
                                                           @Valid @RequestBody MessageInput input) {
        User me = currentUser(authentication.getName());
        LearningConnection connection = activeConnectionFor(input.connectionId(), me);
        User recipient = otherParty(connection, me);
        if (blocks.existsByBlockerAndBlocked(me, recipient) || blocks.existsByBlockerAndBlocked(recipient, me)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Messaging is unavailable for this connection.");
        }
        if (!recipient.getPrivacySettings().isAllowMessages()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This member is not accepting messages.");
        }
        ChatMessage message = messages.save(new ChatMessage(connection, me, input.message().trim()));
        notifications.save(new Notification(recipient, "MESSAGE", "A new message", me.getName() + " sent you a message."));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", message.getId(), "connectionId", connection.getId(),
                "otherUserName", otherParty(connection, me).getName(), "message", message.getMessage(), "createdAt", message.getCreatedAt()));
    }

    @GetMapping("/sessions")
    public List<Map<String, Object>> getSessions(org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        List<LearningConnection> mine = connections.findByRequestSenderOrRequestReceiver(me, me);
        return mine.isEmpty() ? List.of() : sessions.findByConnectionInOrderByDateAsc(mine).stream().map(session -> {
            Map<String, Object> item = new HashMap<>(sessionDto(session, me));
            item.put("reviewedByMe", reviews.existsByReviewerAndConnection(me, session.getConnection()));
            return item;
        }).toList();
    }

    @PostMapping("/sessions")
    public ResponseEntity<Map<String, Object>> createSession(org.springframework.security.core.Authentication authentication,
                                                             @Valid @RequestBody SessionInput input) {
        User me = currentUser(authentication.getName());
        LearningConnection connection = activeConnectionFor(input.connectionId(), me);
        String zone = validateSessionWindow(input.date(), input.startTime(), input.endTime(), input.timeZone());
        ensureNoSessionConflict(me, otherParty(connection, me), input.date(), input.startTime(), input.endTime(), zone, null, Boolean.TRUE.equals(input.overrideAvailability()));
        LearningSession session = sessions.save(new LearningSession(connection, me, input.title().trim(),
                input.skillName().trim(), input.date(), input.startTime(), input.endTime(), zone, trimToNull(input.notes())));
        notifications.save(new Notification(otherParty(connection, me), "SESSION", "A learning session was scheduled",
                me.getName() + " proposed “" + session.getTitle() + "”. Please confirm or decline it."));
        return ResponseEntity.status(HttpStatus.CREATED).body(sessionDto(session, me));
    }

    @PatchMapping("/sessions/{id}")
    public Map<String, Object> updateSession(@PathVariable Long id, @Valid @RequestBody SessionStatusInput input,
                                              org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        LearningSession session = sessions.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found."));
        connectionFor(session.getConnection().getId(), me);
        if (input.date() != null || input.startTime() != null || input.endTime() != null || input.timeZone() != null) {
            if (input.date() == null || input.startTime() == null || input.endTime() == null)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date, start time and end time are required to reschedule.");
            String zone = validateSessionWindow(input.date(), input.startTime(), input.endTime(), input.timeZone());
            ensureNoSessionConflict(me, otherParty(session.getConnection(), me), input.date(), input.startTime(), input.endTime(), zone, session.getId(), Boolean.TRUE.equals(input.overrideAvailability()));
            try { session.reschedule(input.date(), input.startTime(), input.endTime(), zone); }
            catch (IllegalStateException error) { throw new ResponseStatusException(HttpStatus.CONFLICT, error.getMessage()); }
            notifications.save(new Notification(otherParty(session.getConnection(), me), "SESSION", "A session was rescheduled",
                    me.getName() + " proposed a new time for “" + session.getTitle() + "”. Please confirm it."));
            return sessionDto(session, me);
        }
        if (input.status() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a session action.");
        try {
            switch (input.status()) {
                case "ACCEPTED" -> session.accept(me);
                case "CANCELLED" -> session.cancel();
                case "IN_PROGRESS" -> {
                    Instant now = Instant.now();
                    Instant startsAt = sessionInstant(session.getDate(), session.getStartTime(), session.getTimeZone());
                    Instant endsAt = sessionInstant(session.getDate(), session.getEndTime(), session.getTimeZone());
                    if (now.isBefore(startsAt) || !now.isBefore(endsAt)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "A session can only be started during its scheduled time.");
                    }
                    session.start();
                }
                case "COMPLETED" -> {
                    Instant endsAt = sessionInstant(session.getDate(), session.getEndTime(), session.getTimeZone());
                    if (Instant.now().isBefore(endsAt)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "A session can only be completed after its scheduled end time.");
                    }
                    session.confirmCompletion(me);
                }
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid session action.");
            }
        } catch (IllegalStateException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, error.getMessage());
        }
        notifications.save(new Notification(otherParty(session.getConnection(), me), "SESSION",
                "A learning session was updated", "“" + session.getTitle() + "” is now " + session.getStatus().toLowerCase(Locale.ROOT) + "."));
        return sessionDto(session, me);
    }

    @GetMapping("/progress")
    public List<Map<String, Object>> getProgress(org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        return progress.findByUserOrderByIdDesc(me).stream().map(item -> Map.<String, Object>of("id", item.getId(),
                "skillName", item.getSkillName(), "progressPercentage", item.getProgressPercentage(),
                "currentTopic", Objects.requireNonNullElse(item.getCurrentTopic(), ""))).toList();
    }

    @PostMapping("/progress")
    public ResponseEntity<Map<String, Object>> createProgress(org.springframework.security.core.Authentication authentication,
                                                              @Valid @RequestBody ProgressInput input) {
        User me = currentUser(authentication.getName());
        LearningProgress entry = progress.findByUserOrderByIdDesc(me).stream()
                .filter(item -> item.getSkillName().equalsIgnoreCase(input.skillName().trim())).findFirst()
                .orElseGet(() -> new LearningProgress(me, input.skillName().trim()));
        entry.update(input.progressPercentage(), trimToNull(input.currentTopic()),
                trimToNull(input.completedTopics()), trimToNull(input.notes()));
        LearningProgress saved = progress.save(entry);
        return ResponseEntity.status(HttpStatus.CREATED).body(progressDto(saved));
    }

    @PutMapping("/progress/{id}")
    public Map<String, Object> updateProgress(@PathVariable Long id, @Valid @RequestBody ProgressInput input,
                                               org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        LearningProgress entry = progress.findByIdAndUser(id, me)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Learning progress not found."));
        entry.update(input.progressPercentage(), trimToNull(input.currentTopic()),
                trimToNull(input.completedTopics()), trimToNull(input.notes()));
        return progressDto(progress.save(entry));
    }

    @PostMapping("/reports")
    public ResponseEntity<Map<String, Object>> report(org.springframework.security.core.Authentication authentication,
                                                       @Valid @RequestBody ReportInput input) {
        User me = currentUser(authentication.getName());
        String category = input.category().toUpperCase(Locale.ROOT);
        if (!Set.of("SCAM_OR_FRAUD", "HARASSMENT", "INAPPROPRIATE_CONTENT", "FAKE_INFORMATION", "OTHER").contains(category)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid report category.");
        }
        String targetType = input.targetType() == null ? "PLATFORM" : input.targetType().toUpperCase(Locale.ROOT);
        if (!Set.of("PLATFORM", "USER", "MESSAGE", "POST").contains(targetType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid report target.");
        }
        if ("USER".equals(targetType) && (input.targetId() == null || !users.existsById(input.targetId()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The reported profile could not be found.");
        }
        SafetyReport report = reports.save(new SafetyReport(me, category, trimToNull(input.description()), targetType, input.targetId()));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", report.getId(), "status", "PENDING", "receivedAt", Instant.now()));
    }

    @GetMapping("/notifications")
    public List<Map<String, Object>> userNotifications(org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        return notifications.findByUserOrderByCreatedAtDesc(me).stream()
                .map(item -> Map.<String, Object>of("id", item.getId(), "type", item.getType(), "title", item.getTitle(),
                        "message", item.getMessage(), "isRead", item.isRead(), "createdAt", item.getCreatedAt())).toList();
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markNotificationRead(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        Notification notification = notifications.findByIdAndUser(id, me)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found."));
        notification.markRead();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> adminDashboard() {
        return Map.of("totalUsers", users.count(), "activeUsers", users.countByStatus("ACTIVE"),
                "skills", skills.count(), "exchangeRequests", requests.count(), "sessions", sessions.count(),
                "reviews", reviews.count(), "reports", reports.count(),
                "pendingReports", reports.findByOrderByCreatedAtDesc().stream().filter(report -> "PENDING".equals(report.getStatus())).count(),
                "moderationActions", moderationActions.count());
    }

    @GetMapping("/admin/reports")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Map<String, Object>> adminReports() {
        return reports.findByOrderByCreatedAtDesc().stream().map(report -> {
            Map<String, Object> item = new HashMap<>();
            item.put("id", report.getId());
            item.put("reporter", report.getReporter().getName());
            item.put("category", report.getCategory());
            item.put("targetType", report.getTargetType());
            String target = "Platform";
            if ("USER".equals(report.getTargetType()) && report.getTargetId() != null)
                target = users.findById(report.getTargetId()).map(User::getName).orElse("Deleted account");
            else if (report.getTargetId() != null) target = report.getTargetType() + " #" + report.getTargetId();
            item.put("target", target);
            item.put("description", Objects.requireNonNullElse(report.getDescription(), ""));
            item.put("status", report.getStatus());
            item.put("adminAction", Objects.requireNonNullElse(report.getAdminAction(), ""));
            item.put("createdAt", report.getCreatedAt());
            return item;
        }).toList();
    }

    @PatchMapping("/admin/reports/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> moderateReport(@PathVariable Long id, @Valid @RequestBody ModerationInput input,
                                               org.springframework.security.core.Authentication authentication) {
        User admin = currentUser(authentication.getName());
        SafetyReport report = reports.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found."));
        String action = input.action().toUpperCase(Locale.ROOT);
        if (!Set.of("RESOLVE", "DISMISS", "SUSPEND", "RESTRICT", "REMOVE_CONTENT").contains(action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid moderation action.");
        }
        if (Set.of("SUSPEND", "RESTRICT").contains(action) && "USER".equals(report.getTargetType()) && report.getTargetId() != null) {
            User target = users.findById(report.getTargetId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reported account no longer exists."));
            if ("ADMIN".equals(target.getRole())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator accounts cannot be moderated here.");
            target.setStatus("SUSPEND".equals(action) ? "SUSPENDED" : "RESTRICTED");
        } else if ("REMOVE_CONTENT".equals(action) && report.getTargetId() != null && "POST".equals(report.getTargetType())) {
            CommunityPost post = communityPosts.findById(report.getTargetId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reported post no longer exists."));
            post.remove();
        } else if ("REMOVE_CONTENT".equals(action) && report.getTargetId() != null && "COMMENT".equals(report.getTargetType())) {
            if (!communityComments.existsById(report.getTargetId()))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reported comment no longer exists.");
            communityComments.deleteById(report.getTargetId());
        } else if (Set.of("SUSPEND", "RESTRICT").contains(action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only a user-profile report can suspend or restrict an account.");
        } else if ("REMOVE_CONTENT".equals(action)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This report does not reference removable community content.");
        }
        report.resolve(action);
        moderationActions.save(new ModerationAction(admin, report, action, trimToNull(input.notes())));
        notifications.save(new Notification(report.getReporter(), "MODERATION", "Your safety report was reviewed",
                "An administrator reviewed your report and recorded an action."));
        return Map.of("id", report.getId(), "status", report.getStatus(), "adminAction", report.getAdminAction());
    }

    @PostMapping("/users/{id}/block")
    public ResponseEntity<Void> blockUser(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        User blocked = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found."));
        if (me.getId().equals(blocked.getId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot block your own account.");
        if (!blocks.existsByBlockerAndBlocked(me, blocked)) blocks.save(new UserBlock(me, blocked));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/blocks")
    public List<Map<String, Object>> blockedUsers(org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        return blocks.findByBlocker(me).stream().map(block -> Map.<String, Object>of(
                "userId", block.getBlocked().getId(), "name", block.getBlocked().getName())).toList();
    }

    @DeleteMapping("/users/{id}/block")
    public ResponseEntity<Void> unblockUser(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        User blocked = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found."));
        blocks.findByBlockerAndBlocked(me, blocked).ifPresent(blocks::delete);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reviews")
    public ResponseEntity<Map<String, Object>> createReview(org.springframework.security.core.Authentication authentication,
                                                            @Valid @RequestBody ReviewInput input) {
        User reviewer = currentUser(authentication.getName());
        LearningConnection connection = connectionFor(input.connectionId(), reviewer);
        List<LearningSession> completed = sessions.findByConnectionInOrderByDateAsc(List.of(connection)).stream()
                .filter(session -> "COMPLETED".equals(session.getStatus())).toList();
        if (completed.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Complete a learning session before leaving a review.");
        if (reviews.existsByReviewerAndConnection(reviewer, connection)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already reviewed this exchange.");
        }
        User reviewed = otherParty(connection, reviewer);
        Review review = reviews.save(new Review(reviewer, reviewed, connection, input.rating(), trimToNull(input.reviewText())));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", review.getId(), "rating", review.getRating(), "createdAt", review.getCreatedAt()));
    }

    @GetMapping("/users/{id}/reviews")
    public List<Map<String, Object>> userReviews(@PathVariable Long id) {
        User reviewed = users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found."));
        return reviews.findByReviewedUserOrderByCreatedAtDesc(reviewed).stream().map(review -> Map.<String, Object>of(
                "id", review.getId(), "reviewerName", review.getReviewer().getName(), "rating", review.getRating(),
                "reviewText", Objects.requireNonNullElse(review.getReviewText(), ""), "createdAt", review.getCreatedAt())).toList();
    }

    @PostMapping("/ai/doubt")
    public Map<String, Object> askAi(org.springframework.security.core.Authentication authentication,
                                     @Valid @RequestBody AiInput input) {
        User me = currentUser(authentication.getName());
        AiConversation conversation;
        List<Map<String, String>> history;
        String title;
        if (input.conversationId() == null) {
            title = input.question().trim().substring(0, Math.min(input.question().trim().length(), 100));
            conversation = null;
            history = List.of();
        } else {
            conversation = aiConversations.findByIdAndUser(input.conversationId(), me)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found."));
            List<AiMessage> previousMessages = aiMessages.findByConversationOrderByCreatedAtAsc(conversation);
            history = previousMessages.stream()
                    .skip(Math.max(0, previousMessages.size() - 12L))
                    .map(item -> Map.of("role", item.getRole(), "content", item.getContent())).toList();
            title = conversation.getTitle();
        }
        String answer = aiService.answer(input.question().trim(), history);
        if (conversation == null) conversation = aiConversations.save(new AiConversation(me, title));
        aiMessages.save(new AiMessage(conversation, "user", input.question().trim()));
        aiMessages.save(new AiMessage(conversation, "assistant", answer));
        conversation.touch();
        return Map.of("conversationId", conversation.getId(), "answer", answer);
    }

    @GetMapping("/ai/conversations")
    public List<Map<String, Object>> aiConversationList(org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        return aiConversations.findByUserOrderByUpdatedAtDesc(me).stream()
                .map(item -> Map.<String, Object>of("id", item.getId(), "title", item.getTitle(), "updatedAt", item.getUpdatedAt())).toList();
    }

    @GetMapping("/ai/conversations/{id}")
    public Map<String, Object> aiConversation(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        AiConversation conversation = aiConversations.findByIdAndUser(id, me)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found."));
        List<Map<String, Object>> history = aiMessages.findByConversationOrderByCreatedAtAsc(conversation).stream()
                .map(item -> Map.<String, Object>of("role", item.getRole(), "content", item.getContent(), "createdAt", item.getCreatedAt())).toList();
        return Map.of("id", conversation.getId(), "title", conversation.getTitle(), "messages", history);
    }

    @PutMapping("/ai/conversations/{id}")
    public Map<String, Object> renameAiConversation(@PathVariable Long id, @Valid @RequestBody RenameConversationInput input,
                                                    org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        AiConversation conversation = aiConversations.findByIdAndUser(id, me)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found."));
        conversation.rename(input.title().trim());
        return Map.of("id", conversation.getId(), "title", conversation.getTitle());
    }

    @DeleteMapping("/ai/conversations/{id}")
    public ResponseEntity<Void> deleteAiConversation(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        AiConversation conversation = aiConversations.findByIdAndUser(id, me)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found."));
        aiMessages.deleteAll(aiMessages.findByConversationOrderByCreatedAtAsc(conversation));
        aiConversations.delete(conversation);
        return ResponseEntity.noContent().build();
    }

    private User currentUser(String email) {
        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in again."));
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is currently unavailable. Contact support.");
        }
        if (emailVerificationRequired && !user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Verify your email before using SkillBridge.");
        }
        return user;
    }

    private void saveSkills(User user, List<String> names, String type) {
        if (names == null) return;
        names.stream().filter(Objects::nonNull).map(String::trim).filter(name -> !name.isBlank()).distinct()
                .limit(30).forEach(name -> {
                    if (name.length() > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Skill names must be under 100 characters.");
                    Skill skill = skills.findByNameIgnoreCase(name).orElseGet(() -> skills.save(new Skill(name, categoryFor(name))));
                    if (!userSkills.findByUser(user).stream().anyMatch(existing -> existing.getSkill().getId().equals(skill.getId()) && existing.getType().equals(type))) {
                        userSkills.save(new UserSkill(user, skill, type));
                    }
                });
    }

    private String categoryFor(String name) {
        String normalized = name.toLowerCase(Locale.ROOT);
        if (List.of("python", "java", "javascript", "programming", "coding", "machine learning", "ai", "data science").stream().anyMatch(normalized::contains)) return "Technology";
        if (List.of("design", "illustration", "drawing", "figma", "ui", "ux", "photography", "video").stream().anyMatch(normalized::contains)) return "Design";
        if (List.of("spanish", "french", "english", "hindi", "language").stream().anyMatch(normalized::contains)) return "Languages";
        if (List.of("business", "marketing", "finance", "entrepreneurship").stream().anyMatch(normalized::contains)) return "Business";
        return "Other";
    }

    private Set<String> skillNames(List<UserSkill> entries, String type) {
        return entries.stream().filter(item -> type.equals(item.getType()))
                .map(item -> item.getSkill().getName().toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
    }

    private Map<String, Object> matchCard(User current, User other, Set<String> myTeaching, Set<String> myLearning) {
        List<UserSkill> theirs = userSkills.findByUser(other);
        List<UserSkill> theirTeaching = theirs.stream().filter(item -> "TEACH".equals(item.getType())).toList();
        List<UserSkill> theirLearning = theirs.stream().filter(item -> "LEARN".equals(item.getType())).toList();
        List<String> reasons = new ArrayList<>();
        List<String> teaches = theirTeaching.stream().map(item -> item.getSkill().getName()).toList();
        List<String> learns = theirLearning.stream().map(item -> item.getSkill().getName()).toList();
        List<String> teachMatches = theirTeaching.stream().map(item -> item.getSkill().getName())
                .filter(skill -> myLearning.contains(skill.toLowerCase(Locale.ROOT))).distinct().toList();
        List<String> learnMatches = theirLearning.stream().map(item -> item.getSkill().getName())
                .filter(skill -> myTeaching.contains(skill.toLowerCase(Locale.ROOT))).distinct().toList();
        if (!teachMatches.isEmpty()) reasons.add("They can teach you " + String.join(", ", teachMatches));
        if (!learnMatches.isEmpty()) reasons.add("You can teach them " + String.join(", ", learnMatches));
        if (reasons.isEmpty()) return null;
        int possible = myTeaching.size() + myLearning.size();
        int score = Math.min(100, (int) Math.round(100.0 * (teachMatches.size() + learnMatches.size()) / possible));
        String category = theirs.stream().filter(item -> teachMatches.contains(item.getSkill().getName()))
                .map(item -> item.getSkill().getCategory()).findFirst().orElse("Other");
        return Map.of("userId", other.getId(), "name", other.getName(), "bio", Objects.requireNonNullElse(other.getBio(), ""),
                "college", Objects.requireNonNullElse(other.getCollege(), ""), "teaches", teaches, "learns", learns,
                "profileImage", Objects.requireNonNullElse(other.getProfileImage(), ""),
                "matchScore", score, "reasons", reasons, "category", category);
    }

    private String searchable(Map<String, Object> card) {
        String teaches = ((List<?>) card.get("teaches")).stream().map(Object::toString).collect(Collectors.joining(" "));
        String learns = ((List<?>) card.get("learns")).stream().map(Object::toString).collect(Collectors.joining(" "));
        return (card.get("name") + " " + card.get("bio") + " " + teaches + " " + learns).toLowerCase(Locale.ROOT);
    }

    private Map<String, Object> userDto(User user) {
        List<UserSkill> owned = userSkills.findByUser(user);
        List<String> teachingSkills = owned.stream().filter(item -> "TEACH".equals(item.getType())).map(item -> item.getSkill().getName()).toList();
        List<String> learningSkills = owned.stream().filter(item -> "LEARN".equals(item.getType())).map(item -> item.getSkill().getName()).toList();
        List<String> missingProfileFields = new ArrayList<>();
        if (user.getCollege() == null || user.getCollege().isBlank()) missingProfileFields.add("College or organization");
        if (user.getBio() == null || user.getBio().isBlank()) missingProfileFields.add("A short bio");
        if (teachingSkills.isEmpty()) missingProfileFields.add("A skill you can teach");
        if (learningSkills.isEmpty()) missingProfileFields.add("A skill you want to learn");
        int profileCompletion = 100 - missingProfileFields.size() * 20;
        Map<String, Object> result = new HashMap<>();
        result.put("id", user.getId());
        result.put("name", user.getName());
        result.put("email", user.getEmail());
        result.put("college", Objects.requireNonNullElse(user.getCollege(), ""));
        result.put("bio", Objects.requireNonNullElse(user.getBio(), ""));
        result.put("profileImage", Objects.requireNonNullElse(user.getProfileImage(), ""));
        result.put("phone", Objects.requireNonNullElse(user.getPhone(), ""));
        result.put("certifications", Objects.requireNonNullElse(user.getCertifications(), ""));
        result.put("memberSince", user.getCreatedAt().atZone(ZoneId.of("UTC")).getYear());
        result.put("teachingSkills", String.join(", ", teachingSkills));
        result.put("learningSkills", String.join(", ", learningSkills));
        result.put("role", user.getRole());
        result.put("profileCompletion", profileCompletion);
        result.put("profileMissing", missingProfileFields);
        result.put("safetyAcknowledged", user.isSafetyAcknowledged());
        return result;
    }

    private Map<String, Object> privacyDto(UserPrivacySettings settings) {
        return Map.of("profileVisible", settings.isProfileVisible(), "locationVisible", settings.isLocationVisible(),
                "emailVisible", settings.isEmailVisible(), "phoneVisible", settings.isPhoneVisible(),
                "skillsVisible", settings.isSkillsVisible(),
                "availabilityVisible", settings.isAvailabilityVisible(),
                "allowExchangeRequests", settings.isAllowExchangeRequests(), "allowMessages", settings.isAllowMessages());
    }

    private Map<String, Object> requestDto(ExchangeRequest request, User current) {
        User other = request.getSender().getId().equals(current.getId()) ? request.getReceiver() : request.getSender();
        Map<String, Object> result = new HashMap<>();
        result.put("id", request.getId());
        result.put("otherUserId", other.getId());
        result.put("otherUserName", other.getName());
        result.put("otherUserBio", other.getPrivacySettings().isProfileVisible()
                ? Objects.requireNonNullElse(other.getBio(), "") : "");
        result.put("otherUserProfileVisible", other.getPrivacySettings().isProfileVisible());
        List<UserSkill> otherSkills = other.getPrivacySettings().isSkillsVisible()
                ? userSkills.findByUser(other) : List.of();
        result.put("otherUserTeaches", otherSkills.stream().filter(skill -> "TEACH".equals(skill.getType()))
                .map(skill -> skill.getSkill().getName()).toList());
        result.put("otherUserLearns", otherSkills.stream().filter(skill -> "LEARN".equals(skill.getType()))
                .map(skill -> skill.getSkill().getName()).toList());
        result.put("message", Objects.requireNonNullElse(request.getMessage(), ""));
        result.put("status", request.getStatus());
        result.put("isIncoming", request.getReceiver().getId().equals(current.getId()));
        result.put("createdAt", request.getCreatedAt());
        connections.findByRequest(request).ifPresent(connection -> {
            result.put("connectionId", connection.getId());
            result.put("connectionStatus", connection.getStatus());
        });
        return result;
    }

    private Map<String, Object> progressDto(LearningProgress item) {
        return Map.of("id", item.getId(), "skillName", item.getSkillName(),
                "progressPercentage", item.getProgressPercentage(), "currentTopic", Objects.requireNonNullElse(item.getCurrentTopic(), ""));
    }

    private LearningConnection connectionFor(Long id, User user) {
        return connections.findByIdAndRequestSender(id, user).or(() -> connections.findByIdAndRequestReceiver(id, user))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "An accepted exchange is required for this action."));
    }

    private LearningConnection activeConnectionFor(Long id, User user) {
        LearningConnection connection = connectionFor(id, user);
        if (!"ACTIVE".equals(connection.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This exchange is paused or completed and cannot be used for this action.");
        }
        return connection;
    }

    private boolean isBlockedWith(LearningConnection connection, User user) {
        User other = otherParty(connection, user);
        return blocks.existsByBlockerAndBlocked(user, other) || blocks.existsByBlockerAndBlocked(other, user);
    }

    private Map<String, Object> sessionDto(LearningSession session, User current) {
        Map<String, Object> result = new HashMap<>();
        result.put("id", session.getId());
        result.put("connectionId", session.getConnection().getId());
        result.put("title", session.getTitle());
        result.put("skillName", session.getSkillName());
        result.put("date", session.getDate());
        result.put("startTime", session.getStartTime());
        result.put("endTime", session.getEndTime());
        result.put("timeZone", session.getTimeZone());
        result.put("status", session.getStatus());
        result.put("createdByMe", session.isCreatedBy(current));
        result.put("completionConfirmedByMe", session.hasConfirmedCompletion(current));
        result.put("partnerName", otherParty(session.getConnection(), current).getName());
        return result;
    }

    private User otherParty(LearningConnection connection, User current) {
        ExchangeRequest request = connection.getRequest();
        return request.getSender().getId().equals(current.getId()) ? request.getReceiver() : request.getSender();
    }

    private Map<String, Object> respondToRequest(Long id, User current, String status) {
        ExchangeRequest request = requests.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found."));
        if (!request.getReceiver().getId().equals(current.getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the person who received this request can respond.");
        if (!"PENDING".equals(request.getStatus())) throw new ResponseStatusException(HttpStatus.CONFLICT, "This request has already been answered.");
        request.respond(status);
        if ("ACCEPTED".equals(status)) {
            connections.save(new LearningConnection(request));
            notifications.save(new Notification(request.getSender(), "EXCHANGE_ACCEPTED", "Your exchange request was accepted",
                    current.getName() + " is ready to learn together."));
        } else {
            notifications.save(new Notification(request.getSender(), "EXCHANGE_REJECTED", "An exchange request was declined",
                    current.getName() + " is unable to connect right now."));
        }
        return requestDto(request, current);
    }

    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private String validateSessionWindow(LocalDate date, String start, String end, String requestedZone) {
        LocalTime startTime = LocalTime.parse(start);
        LocalTime endTime = LocalTime.parse(end);
        if (!endTime.isAfter(startTime)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The end time must be later than the start time.");
        String zone = requestedZone == null || requestedZone.isBlank() ? "UTC" : requestedZone.trim();
        try {
            ZoneId.of(zone);
            if (!sessionInstant(date, start, zone).isAfter(Instant.now()))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a future session time.");
        } catch (java.time.DateTimeException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid time zone and session time.");
        }
        return zone;
    }

    private void ensureNoSessionConflict(User first, User second, LocalDate date, String start, String end,
                                         String zone, Long excludedSessionId, boolean overrideAvailability) {
        LinkedHashMap<Long, LearningConnection> relevant = new LinkedHashMap<>();
        for (User participant : List.of(first, second)) {
            connections.findByRequestSenderOrRequestReceiver(participant, participant)
                    .forEach(connection -> relevant.put(connection.getId(), connection));
        }
        if (relevant.isEmpty()) return;
        Instant candidateStart = sessionInstant(date, start, zone);
        Instant candidateEnd = sessionInstant(date, end, zone);
        boolean conflict = sessions.findByConnectionInOrderByDateAsc(new ArrayList<>(relevant.values())).stream()
                .filter(existing -> !Objects.equals(existing.getId(), excludedSessionId))
                .filter(existing -> Set.of("PENDING_CONFIRMATION", "UPCOMING", "IN_PROGRESS", "COMPLETION_PENDING").contains(existing.getStatus()))
                .anyMatch(existing -> candidateStart.isBefore(sessionInstant(existing.getDate(), existing.getEndTime(), existing.getTimeZone()))
                        && candidateEnd.isAfter(sessionInstant(existing.getDate(), existing.getStartTime(), existing.getTimeZone())));
        if (conflict) throw new ResponseStatusException(HttpStatus.CONFLICT, "This time overlaps a scheduled session for you or your partner.");
        if (!overrideAvailability) {
            ensureWithinAvailability(first, candidateStart, candidateEnd);
            ensureWithinAvailability(second, candidateStart, candidateEnd);
        }
    }

    private void ensureWithinAvailability(User user, Instant start, Instant end) {
        List<AvailabilitySlot> slots = availabilitySlots.findByUserOrderByDayOfWeekAscStartTimeAsc(user);
        if (slots.isEmpty()) return;
        boolean covered = slots.stream().anyMatch(slot -> {
            ZoneId zone = ZoneId.of(slot.getTimeZone());
            ZonedDateTime localStart = start.atZone(zone), localEnd = end.atZone(zone);
            return localStart.toLocalDate().equals(localEnd.toLocalDate())
                    && localStart.getDayOfWeek().getValue() == slot.getDayOfWeek()
                    && !localStart.toLocalTime().isBefore(slot.getStartTime())
                    && !localEnd.toLocalTime().isAfter(slot.getEndTime());
        });
        if (!covered) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This session is outside a participant's availability. Update availability or explicitly override it.");
    }

    private Instant sessionInstant(LocalDate date, String time, String zone) {
        java.time.LocalDateTime local = java.time.LocalDateTime.of(date, LocalTime.parse(time));
        ZoneId zoneId = ZoneId.of(zone == null || zone.isBlank() ? "UTC" : zone);
        if (zoneId.getRules().getValidOffsets(local).isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That local time does not exist because of a daylight-saving clock change.");
        return local.atZone(zoneId).toInstant();
    }

    public record AuthResponse(String token, Map<String, Object> user, boolean verificationRequired) {}
    public record LoginChallengeResponse(boolean otpRequired, String message) {}
    public record RegisterRequest(@NotBlank @Size(max = 80) String name,
                                  @NotBlank @Email @Size(max = 254) String email,
                                  @NotBlank @Size(min = 8, max = 72) String password,
                                  @Size(max = 160) String college) {}
    public record LoginRequest(@NotBlank @Email @Size(max = 254) String email, @NotBlank String password) {}
    public record LoginVerificationInput(@NotBlank @Email @Size(max = 254) String email,
                                         @NotBlank @Pattern(regexp = "\\d{6}") String code) {}
    public record EmailVerificationInput(@NotBlank @Size(min = 32, max = 100) String token) {}
    public record PasswordResetRequest(@NotBlank @Email @Size(max = 254) String email) {}
    public record PasswordResetConfirmation(@NotBlank @Email @Size(max = 254) String email,
                                            @NotBlank @Pattern(regexp = "\\d{6}") String code,
                                            @NotBlank @Size(min = 8, max = 72) String newPassword) {}
    public record ProfileRequest(@NotBlank @Size(max = 80) String name, @Size(max = 160) String college,
                                 @Size(max = 500) String bio, @Size(max = 40) String phone,
                                 @Size(max = 1000) String certifications, List<@Size(max = 100) String> teachingSkills,
                                 List<@Size(max = 100) String> learningSkills, Boolean safetyAcknowledged) {}
    public record PrivacyInput(Boolean profileVisible, Boolean locationVisible, Boolean emailVisible,
                               Boolean phoneVisible, Boolean skillsVisible, Boolean availabilityVisible,
                               Boolean allowExchangeRequests, Boolean allowMessages) {}
    public record AvailabilityInput(@NotNull @Size(max = 42) List<@Valid AvailabilitySlotInput> slots) {}
    public record AvailabilitySlotInput(@Min(1) @Max(7) int dayOfWeek, @NotNull LocalTime startTime,
                                        @NotNull LocalTime endTime, @NotBlank @Size(max = 64) String timeZone,
                                        @NotBlank String mode, @Min(15) @Max(240) int preferredDurationMinutes) {}
    public record ExchangeInput(@NotNull Long receiverId, @Size(max = 1000) String message) {}
    public record MessageInput(@NotNull Long connectionId, @NotBlank @Size(max = 4000) String message) {}
    public record SessionInput(@NotNull Long connectionId, @NotBlank @Size(max = 120) String title,
                               @NotBlank @Size(max = 100) String skillName, @NotNull LocalDate date,
                               @NotBlank @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d") String startTime,
                               @NotBlank @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d") String endTime,
                               @Size(max = 1200) String notes, @Size(max = 64) String timeZone, Boolean overrideAvailability) {}
    public record SessionStatusInput(@Pattern(regexp = "ACCEPTED|CANCELLED|IN_PROGRESS|COMPLETED") String status,
                                    LocalDate date,
                                    @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d") String startTime,
                                    @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d") String endTime,
                                    @Size(max = 64) String timeZone, Boolean overrideAvailability) {}
    public record ConnectionStatusInput(@NotBlank @Pattern(regexp = "ACTIVE|PAUSED|COMPLETED") String status) {}
    public record ProgressInput(@NotBlank @Size(max = 100) String skillName, @Min(0) @Max(100) int progressPercentage,
                                @Size(max = 120) String currentTopic, @Size(max = 2000) String completedTopics,
                                @Size(max = 1200) String notes) {}
    public record ReportInput(@NotBlank @Size(max = 40) String category, @Size(max = 1000) String description,
                              @Size(max = 20) String targetType, Long targetId) {}
    public record ReviewInput(@NotNull Long connectionId, @Min(1) @Max(5) int rating, @Size(max = 1200) String reviewText) {}
    public record ModerationInput(@NotBlank @Size(max = 30) String action, @Size(max = 500) String notes) {}
    public record AiInput(@NotBlank @Size(max = 4000) String question, Long conversationId) {}
    public record RenameConversationInput(@NotBlank @Size(max = 120) String title) {}
}
