package com.skillbridge.config;

import com.skillbridge.model.*;
import com.skillbridge.repository.*;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Configuration
@Profile("demo")
@ConditionalOnProperty(name = "skillbridge.demo.seed-enabled", havingValue = "true")
public class DemoDataInitializer {
    static final String DEMO_PASSWORD = "SkillBridgeDemo2026!";
    private static final ZoneId DEMO_ZONE = ZoneId.of("Asia/Kolkata");

    @Bean
    ApplicationRunner seedDemoData(UserRepository users, SkillRepository skills, UserSkillRepository userSkills,
                                   ExchangeRequestRepository requests, LearningConnectionRepository connections,
                                   ChatMessageRepository messages, LearningSessionRepository sessions,
                                   LearningProgressRepository progress, AvailabilitySlotRepository availabilitySlots,
                                   ReviewRepository reviews,
                                   CommunityPostRepository posts,
                                   CommunityCommentRepository comments, CommunityLikeRepository likes,
                                   PasswordEncoder passwordEncoder) {
        return args -> initialize(users, skills, userSkills, requests, connections, messages, sessions,
                progress, availabilitySlots, reviews, posts, comments, likes, passwordEncoder);
    }

    @Transactional
    void initialize(UserRepository users, SkillRepository skills, UserSkillRepository userSkills,
                    ExchangeRequestRepository requests, LearningConnectionRepository connections,
                    ChatMessageRepository messages, LearningSessionRepository sessions,
                    LearningProgressRepository progress, AvailabilitySlotRepository availabilitySlots,
                    ReviewRepository reviews,
                    CommunityPostRepository posts,
                    CommunityCommentRepository comments, CommunityLikeRepository likes,
                    PasswordEncoder passwordEncoder) {
        User maya = demoUser(users, "Maya Chen", "maya@demo.skillbridge.local",
                "A curious Python tutor who is learning visual design.", passwordEncoder);
        User arjun = demoUser(users, "Arjun Rao", "arjun@demo.skillbridge.local",
                "A product designer who is building confidence with Python.", passwordEncoder);
        User lila = demoUser(users, "Lila Morgan", "lila@demo.skillbridge.local",
                "An Excel mentor exploring user experience research.", passwordEncoder);
        User noah = demoUser(users, "Noah Williams", "noah@demo.skillbridge.local",
                "A UX designer who wants to get better at spreadsheets.", passwordEncoder);
        maya.setCertifications("Python Foundations Certificate (sample); Peer Mentor Certificate (sample)");
        arjun.setCertifications("UI Design Fundamentals Certificate (sample)");
        lila.setCertifications("Excel Essentials Certificate (sample)");
        noah.setCertifications("UX Research Foundations Certificate (sample)");
        users.saveAll(List.of(maya, arjun, lila, noah));

        List<DemoPerson> additionalPeople = List.of(
                new DemoPerson("Riya Kapoor", "riya@demo.skillbridge.local",
                        "A visual designer who enjoys helping beginners build confidence.",
                        "UI Design", "Design", "Python", "Technology"),
                new DemoPerson("Ethan Brooks", "ethan@demo.skillbridge.local",
                        "A Python developer learning to create thoughtful interfaces.",
                        "Python", "Technology", "UI Design", "Design"),
                new DemoPerson("Priya Shah", "priya@demo.skillbridge.local",
                        "A researcher who wants to make spreadsheet analysis easier.",
                        "UX Research", "Design", "Excel", "Business"),
                new DemoPerson("Jules Bernard", "jules@demo.skillbridge.local",
                        "An Excel enthusiast learning how to run better user interviews.",
                        "Excel", "Business", "UX Research", "Design"),
                new DemoPerson("Mateo Silva", "mateo@demo.skillbridge.local",
                        "A Spanish conversation partner who is exploring photography.",
                        "Spanish", "Languages", "Photography", "Design"),
                new DemoPerson("Caleb Turner", "caleb@demo.skillbridge.local",
                        "A photographer who wants to practice conversational Spanish.",
                        "Photography", "Design", "Spanish", "Languages"),
                new DemoPerson("Aisha Khan", "aisha@demo.skillbridge.local",
                        "A data science student learning to communicate ideas visually.",
                        "Data Science", "Technology", "Graphic Design", "Design"),
                new DemoPerson("Samira Patel", "samira@demo.skillbridge.local",
                        "A graphic designer curious about working with real datasets.",
                        "Graphic Design", "Design", "Data Science", "Technology"),
                new DemoPerson("Oliver Reed", "oliver@demo.skillbridge.local",
                        "A JavaScript mentor interested in product planning.",
                        "JavaScript", "Technology", "Product Management", "Business"),
                new DemoPerson("Zoe Park", "zoe@demo.skillbridge.local",
                        "A product planner who wants to learn practical JavaScript.",
                        "Product Management", "Business", "JavaScript", "Technology"),
                new DemoPerson("Nina Patel", "nina@demo.skillbridge.local",
                        "A designer sharing practical visual storytelling and presentation skills.",
                        "Graphic Design", "Design", "Public Speaking", "Communication"),
                new DemoPerson("Marcus Lee", "marcus@demo.skillbridge.local",
                        "A confident presenter learning to create polished visual materials.",
                        "Public Speaking", "Communication", "Graphic Design", "Design"),
                new DemoPerson("Farah Ali", "farah@demo.skillbridge.local",
                        "A language learner who enjoys helping others discover photography.",
                        "Spanish", "Languages", "Photography", "Design"),
                new DemoPerson("Daniel Kim", "daniel@demo.skillbridge.local",
                        "A photographer interested in practicing conversational Spanish.",
                        "Photography", "Design", "Spanish", "Languages"),
                new DemoPerson("Grace Okafor", "grace@demo.skillbridge.local",
                        "A spreadsheet mentor learning thoughtful user research techniques.",
                        "Excel", "Business", "UX Research", "Design"),
                new DemoPerson("Leo Martin", "leo@demo.skillbridge.local",
                        "A UX researcher learning to organize findings in spreadsheets.",
                        "UX Research", "Design", "Excel", "Business"),
                new DemoPerson("Ishaan Mehta", "ishaan@demo.skillbridge.local",
                        "A Python tutor exploring clear and useful data visualizations.",
                        "Python", "Technology", "Data Visualization", "Technology"),
                new DemoPerson("Sofia Alvarez", "sofia@demo.skillbridge.local",
                        "A data storyteller building confidence with Python fundamentals.",
                        "Data Visualization", "Technology", "Python", "Technology"),
                new DemoPerson("Amara Johnson", "amara@demo.skillbridge.local",
                        "A career mentor helping learners prepare for interviews and new roles.",
                        "Resume Writing", "Career", "Interview Preparation", "Career"),
                new DemoPerson("Ben Carter", "ben@demo.skillbridge.local",
                        "A job seeker polishing interview skills and learning to write a strong resume.",
                        "Interview Preparation", "Career", "Resume Writing", "Career"),
                new DemoPerson("Mei Tan", "mei@demo.skillbridge.local",
                        "A JavaScript developer curious about product strategy and planning.",
                        "JavaScript", "Technology", "Product Management", "Business"),
                new DemoPerson("Ravi Nair", "ravi@demo.skillbridge.local",
                        "A product planner learning practical web development with JavaScript.",
                        "Product Management", "Business", "JavaScript", "Technology"),
                new DemoPerson("Tara Singh", "tara@demo.skillbridge.local",
                        "A French conversation partner who loves sharing simple baking techniques.",
                        "French", "Languages", "Baking", "Lifestyle"),
                new DemoPerson("Owen Clarke", "owen@demo.skillbridge.local",
                        "A home baker learning French phrases for travel and conversation.",
                        "Baking", "Lifestyle", "French", "Languages"),
                new DemoPerson("Elena Petrova", "elena@demo.skillbridge.local",
                        "A music producer who wants to learn accessible video editing.",
                        "Music Production", "Creative Arts", "Video Editing", "Creative Arts"),
                new DemoPerson("Jayden Brooks", "jayden@demo.skillbridge.local",
                        "A video editor exploring sound design and music production.",
                        "Video Editing", "Creative Arts", "Music Production", "Creative Arts"),
                new DemoPerson("Mina Sato", "mina@demo.skillbridge.local",
                        "A data analyst sharing SQL foundations and learning project planning.",
                        "SQL", "Technology", "Project Management", "Business"),
                new DemoPerson("Andre Wilson", "andre@demo.skillbridge.local",
                        "A project coordinator learning how to ask questions of real datasets.",
                        "Project Management", "Business", "SQL", "Technology"),
                new DemoPerson("Pooja Rao", "pooja@demo.skillbridge.local",
                        "A cooking enthusiast learning thoughtful photography and composition.",
                        "Cooking", "Lifestyle", "Photography", "Design"),
                new DemoPerson("Callum Hayes", "callum@demo.skillbridge.local",
                        "A photographer looking for new recipes and kitchen confidence.",
                        "Photography", "Design", "Cooking", "Lifestyle"),
                new DemoPerson("Hannah Brooks", "hannah@demo.skillbridge.local",
                        "A biology tutor who enjoys making science easier to understand.",
                        "Biology", "Science", "Public Speaking", "Communication"),
                new DemoPerson("Isaac Green", "isaac@demo.skillbridge.local",
                        "A confident speaker curious about biology and nature.",
                        "Public Speaking", "Communication", "Biology", "Science"),
                new DemoPerson("Noor Rahman", "noor@demo.skillbridge.local",
                        "A patient guitar teacher learning practical web development.",
                        "Guitar", "Music", "Web Development", "Technology"),
                new DemoPerson("James Miller", "james@demo.skillbridge.local",
                        "A web developer looking to learn guitar from the basics.",
                        "Web Development", "Technology", "Guitar", "Music"),
                new DemoPerson("Camille Laurent", "camille@demo.skillbridge.local",
                        "A Spanish speaker helping others build everyday conversation skills.",
                        "Spanish", "Languages", "Data Analysis", "Technology"),
                new DemoPerson("Diego Flores", "diego@demo.skillbridge.local",
                        "A data analyst practicing Spanish for travel and conversation.",
                        "Data Analysis", "Technology", "Spanish", "Languages"),
                new DemoPerson("Stella Nguyen", "stella@demo.skillbridge.local",
                        "A thoughtful baker learning how to plan small business projects.",
                        "Baking", "Lifestyle", "Project Planning", "Business"),
                new DemoPerson("Max Robinson", "max@demo.skillbridge.local",
                        "A project planner learning to bake and decorate simple treats.",
                        "Project Planning", "Business", "Baking", "Lifestyle"),
                new DemoPerson("Imani Williams", "imani@demo.skillbridge.local",
                        "A creative photographer learning to write clear and engaging stories.",
                        "Photography", "Design", "Creative Writing", "Writing"),
                new DemoPerson("Peter Novak", "peter@demo.skillbridge.local",
                        "A writer practicing photography to document local adventures.",
                        "Creative Writing", "Writing", "Photography", "Design"));
        List<User> additionalUsers = additionalPeople.stream()
                .map(person -> demoUser(users, person.name(), person.email(), person.bio(), passwordEncoder))
                .toList();
        for (int i = 0; i < additionalPeople.size(); i++) {
            User user = additionalUsers.get(i);
            user.setCertifications(additionalPeople.get(i).teaches() + " Foundations Certificate (sample)");
        }
        users.saveAll(additionalUsers);

        addSkill(maya, "Python", "Technology", "TEACH", userSkills, skills);
        addSkill(maya, "UI Design", "Design", "LEARN", userSkills, skills);
        addSkill(arjun, "UI Design", "Design", "TEACH", userSkills, skills);
        addSkill(arjun, "Python", "Technology", "LEARN", userSkills, skills);
        addSkill(lila, "Excel", "Business", "TEACH", userSkills, skills);
        addSkill(lila, "UX Research", "Design", "LEARN", userSkills, skills);
        addSkill(noah, "UX Research", "Design", "TEACH", userSkills, skills);
        addSkill(noah, "Excel", "Business", "LEARN", userSkills, skills);
        addSkill(maya, "UX Research", "Design", "TEACH", userSkills, skills);
        addSkill(maya, "Excel", "Business", "LEARN", userSkills, skills);

        List<String> mayaTeachingSkills = List.of("Python", "UX Research", "Graphic Design", "Spanish",
                "Data Science", "Excel", "Public Speaking", "Photography", "Cooking");
        List<String> mayaLearningSkills = List.of("UI Design", "Excel", "Data Visualization",
                "Interview Preparation", "Guitar", "Web Development", "Baking", "Creative Writing");
        for (int i = 0; i < additionalPeople.size(); i++) {
            DemoPerson person = additionalPeople.get(i);
            User user = additionalUsers.get(i);
            addSkill(user, person.teaches(), person.teachingCategory(), "TEACH", userSkills, skills);
            addSkill(user, person.learns(), person.learningCategory(), "LEARN", userSkills, skills);
            if (!mayaLearningSkills.contains(person.teaches())
                    && !mayaTeachingSkills.contains(person.learns())) {
                String complementarySkill = mayaTeachingSkills.get(i % mayaTeachingSkills.size());
                addSkill(user, complementarySkill, categoryFor(complementarySkill), "LEARN", userSkills, skills);
            }
        }
        for (String skill : List.of("Graphic Design", "Spanish", "Data Science", "Excel",
                "Public Speaking", "Photography", "Cooking")) {
            addSkill(maya, skill, categoryFor(skill), "TEACH", userSkills, skills);
        }
        for (String skill : List.of("Data Visualization", "Interview Preparation", "Guitar",
                "Web Development", "Baking", "Creative Writing")) {
            addSkill(maya, skill, categoryFor(skill), "LEARN", userSkills, skills);
        }

        LearningConnection mayaConnection = acceptedConnection(maya, arjun, requests, connections);
        LearningConnection lilaConnection = acceptedConnection(lila, noah, requests, connections);
        List<LearningConnection> mayaConnections = new ArrayList<>();
        mayaConnections.add(mayaConnection);
        for (int i = 0; i < 7; i++) {
            mayaConnections.add(acceptedConnection(maya, additionalUsers.get(i * 2), requests, connections));
        }
        seedReviews(mayaConnection, maya, arjun, reviews);
        seedReviews(lilaConnection, lila, noah, reviews);
        seedCompletedSession(mayaConnection, maya, arjun, "Python foundations completed",
                "Python", sessions);
        seedCompletedSession(lilaConnection, lila, noah, "Excel basics completed",
                "Excel", sessions);
        seedMessages(mayaConnection, maya, arjun, messages,
                List.of("Hi Arjun! I can walk through Python lists and dictionaries.",
                        "That would be great. I can show you how I approach layout and spacing in UI design.",
                        "Perfect — I added a session idea to the calendar. See you there!"));
        for (int i = 1; i < mayaConnections.size(); i++) {
            User partner = additionalUsers.get((i - 1) * 2);
            seedReviews(mayaConnections.get(i), maya, partner, reviews);
            seedCompletedSession(mayaConnections.get(i), maya, partner,
                    "SkillBridge exchange " + i + " completed", List.of("Spanish", "Excel", "Photography",
                            "Graphic Design", "JavaScript", "Public Speaking", "Data Science").get(i - 1), sessions);
        }
        seedMessages(lilaConnection, lila, noah, messages,
                List.of("I can share a few spreadsheet shortcuts for cleaning data.",
                        "Thanks! I can bring a simple UX interview plan to our exchange."));

        for (int i = 0; i < additionalPeople.size(); i += 2) {
            DemoPerson person = additionalPeople.get(i);
            User first = additionalUsers.get(i);
            User second = additionalUsers.get(i + 1);
            LearningConnection connection = acceptedConnection(first, second, requests, connections);
            seedReviews(connection, first, second, reviews);
            seedMessages(connection, first, second, messages,
                    List.of("Hi " + second.getName() + "! Looking forward to trading " + person.teaches()
                                    + " for " + person.learns() + ".",
                            "Sounds great. I'll bring a beginner-friendly exercise.",
                            "I added our first session to the calendar. Looking forward to learning together!"));
            seedSession(connection, first, person.teaches() + " skill exchange", person.teaches(),
                    LocalDate.now(DEMO_ZONE).plusDays(2L + i / 2), "16:00", "17:00", true, sessions);
            seedSession(connection, second, person.learns() + " follow-up practice", person.learns(),
                    LocalDate.now(DEMO_ZONE).plusDays(5L + i / 2), "17:00", "18:00", true, sessions);
            seedCompletedSession(connection, first, second, person.teaches() + " completed practice",
                    person.teaches(), sessions);
            seedProgress(first, person.learns(), 20 + (i * 7 % 61), "Getting started with " + person.learns(), progress);
            seedProgress(second, additionalPeople.get(i + 1).learns(),
                    20 + ((i + 1) * 7 % 61), "Getting started with " + additionalPeople.get(i + 1).learns(), progress);
            seedAvailability(first, availabilitySlots);
            seedAvailability(second, availabilitySlots);
        }

        seedSession(mayaConnection, maya, "Python data structures", "Python", LocalDate.now(DEMO_ZONE).plusDays(2), "18:00", "19:00", true, sessions);
        seedSession(mayaConnection, maya, "UI layout and spacing practice", "UI Design", LocalDate.now(DEMO_ZONE).plusDays(4), "17:00", "18:00", true, sessions);
        seedSession(mayaConnection, maya, "Python functions and small projects", "Python", LocalDate.now(DEMO_ZONE).plusDays(7), "18:00", "19:00", true, sessions);
        seedSession(mayaConnection, maya, "Design feedback and portfolio review", "UI Design", LocalDate.now(DEMO_ZONE).plusDays(11), "16:00", "17:00", true, sessions);
        for (int i = 1; i < 5; i++) {
            User partner = additionalUsers.get((i - 1) * 2);
            seedSession(mayaConnections.get(i), maya, "Weekly skill exchange " + i,
                    List.of("Spanish", "Excel", "Photography", "Graphic Design").get(i - 1),
                    LocalDate.now(DEMO_ZONE).plusDays(3L + i * 2), "18:00", "19:00", true, sessions);
        }
        seedCompletedSession(mayaConnection, maya, arjun, "Portfolio skills exchange completed",
                "UI Design", sessions);
        seedSession(lilaConnection, lila, "Excel cleanup and UX notes", "Excel", LocalDate.now(DEMO_ZONE).plusDays(5), "17:00", "18:00", true, sessions);
        seedSession(lilaConnection, noah, "UX interview practice", "UX Research", LocalDate.now(DEMO_ZONE).plusDays(9), "17:00", "18:00", true, sessions);
        seedProgress(maya, "Python", 45, "Lists and dictionaries", progress);
        seedProgress(arjun, "Python", 20, "Variables and functions", progress);
        seedProgress(lila, "Excel", 65, "Lookup formulas", progress);
        seedProgress(noah, "Excel", 35, "Formatting and sorting data", progress);
        seedProgress(maya, "UI Design", 30, "Spacing and visual hierarchy", progress);
        seedProgress(maya, "Excel", 55, "Useful formulas and clean data", progress);
        seedProgress(maya, "Data Visualization", 35, "Choosing clear chart types", progress);
        seedProgress(maya, "Interview Preparation", 25, "Structuring confident answers", progress);
        seedProgress(maya, "Guitar", 20, "Open chords and rhythm", progress);
        seedProgress(maya, "Web Development", 40, "Building accessible page layouts", progress);
        seedProgress(maya, "Baking", 30, "Practicing reliable basics", progress);
        seedProgress(maya, "Creative Writing", 45, "Finding a clear story arc", progress);
        seedProgress(maya, "UX Research", 15, "Writing interview questions", progress);
        seedAvailability(maya, availabilitySlots);
        seedAvailability(arjun, availabilitySlots);
        seedAvailability(lila, availabilitySlots);
        seedAvailability(noah, availabilitySlots);

        seedCommunity(posts, comments, likes, maya, arjun, lila, noah);
    }

    private User demoUser(UserRepository users, String name, String email, String bio, PasswordEncoder encoder) {
        User user = users.findByEmailIgnoreCase(email)
                .orElseGet(() -> new User(name, email, encoder.encode(DEMO_PASSWORD), "SkillBridge Demo (sample data)"));
        if (user.getId() == null) user = users.save(user);
        user.setBio(bio + " DEMO ACCOUNT.");
        user.setSafetyAcknowledged(true);
        user.setPhone(String.format("+1 202 555 01%02d", Math.floorMod(user.getId().intValue(), 100)));
        user.setProfileImage("https://i.pravatar.cc/160?img=" + (Math.floorMod(user.getId().intValue(), 70) + 1));
        user.setCreatedAt(LocalDate.now(DEMO_ZONE).minusYears(3).atStartOfDay(DEMO_ZONE).toInstant());
        user.getPrivacySettings().setPhoneVisible(true);
        return users.save(user);
    }

    private String categoryFor(String skill) {
        return switch (skill) {
            case "Excel" -> "Business";
            case "Spanish" -> "Languages";
            case "Graphic Design", "Photography" -> "Design";
            case "Public Speaking" -> "Communication";
            case "Interview Preparation" -> "Career";
            case "Guitar" -> "Music";
            case "Baking", "Cooking" -> "Lifestyle";
            case "Creative Writing" -> "Writing";
            default -> "Technology";
        };
    }

    private void seedReviews(LearningConnection connection, User first, User second, ReviewRepository reviews) {
        if (!reviews.existsByReviewerAndConnection(first, connection)) {
            reviews.save(new Review(first, second, connection,
                    4 + Math.floorMod(first.getEmail().hashCode(), 2),
                    "A thoughtful, encouraging learning partner. DEMO SAMPLE REVIEW."));
        }
        if (!reviews.existsByReviewerAndConnection(second, connection)) {
            reviews.save(new Review(second, first, connection,
                    4 + Math.floorMod(second.getEmail().hashCode(), 2),
                    "A friendly exchange with clear explanations and useful practice. DEMO SAMPLE REVIEW."));
        }
    }

    private LearningConnection acceptedConnection(User sender, User receiver, ExchangeRequestRepository requests,
                                                   LearningConnectionRepository connections) {
        return requests.findBySenderAndReceiver(sender, receiver).stream()
                .filter(request -> "ACCEPTED".equals(request.getStatus()))
                .findFirst().flatMap(connections::findByRequest).orElseGet(() -> {
                    ExchangeRequest request = new ExchangeRequest(sender, receiver, "DEMO DATA: sample accepted learning exchange.");
                    request.respond("ACCEPTED");
                    return connections.save(new LearningConnection(requests.save(request)));
                });
    }

    private void addSkill(User user, String name, String category, String type,
                          UserSkillRepository userSkills, SkillRepository skills) {
        Skill skill = skills.findByNameIgnoreCase(name).orElseGet(() -> skills.save(new Skill(name, category)));
        boolean exists = userSkills.findByUser(user).stream()
                .anyMatch(item -> item.getSkill().getId().equals(skill.getId()) && item.getType().equals(type));
        if (!exists) userSkills.save(new UserSkill(user, skill, type));
    }

    private void seedMessages(LearningConnection connection, User first, User second,
                              ChatMessageRepository messages, List<String> conversation) {
        if (!messages.findByConnectionOrderByCreatedAtAsc(connection).isEmpty()) return;
        for (int i = 0; i < conversation.size(); i++) {
            messages.save(new ChatMessage(connection, i % 2 == 0 ? first : second, conversation.get(i)));
        }
    }

    private void seedSession(LearningConnection connection, User creator, String title, String skill,
                             LocalDate date, String start, String end, boolean accepted,
                             LearningSessionRepository sessions) {
        if (sessions.findByConnectionInOrderByDateAsc(List.of(connection)).stream()
                .anyMatch(existing -> existing.getTitle().equalsIgnoreCase(title))) return;
        LearningSession session = sessions.save(new LearningSession(connection, creator, title, skill, date,
                start, end, DEMO_ZONE.getId(), "DEMO DATA: sample session for product walkthrough."));
        if (accepted) {
            session.accept(connection.getRequest().getSender().getId().equals(creator.getId())
                    ? connection.getRequest().getReceiver() : connection.getRequest().getSender());
            sessions.save(session);
        }
    }

    private void seedCompletedSession(LearningConnection connection, User creator, User partner, String title,
                                     String skill, LearningSessionRepository sessions) {
        if (sessions.findByConnectionInOrderByDateAsc(List.of(connection)).stream()
                .anyMatch(existing -> existing.getTitle().equalsIgnoreCase(title))) return;
        LearningSession session = sessions.save(new LearningSession(connection, creator, title, skill,
                LocalDate.now(DEMO_ZONE).minusDays(7), "15:00", "16:00", DEMO_ZONE.getId(),
                "DEMO DATA: sample completed session for the dashboard."));
        session.accept(partner);
        session.confirmCompletion(creator);
        session.confirmCompletion(partner);
        sessions.save(session);
    }

    private void seedAvailability(User user, AvailabilitySlotRepository availabilitySlots) {
        if (!availabilitySlots.findByUserOrderByDayOfWeekAscStartTimeAsc(user).isEmpty()) return;
        availabilitySlots.saveAll(List.of(
                new AvailabilitySlot(user, 2, java.time.LocalTime.of(17, 0), java.time.LocalTime.of(19, 0),
                        DEMO_ZONE.getId(), "ONLINE", 60),
                new AvailabilitySlot(user, 4, java.time.LocalTime.of(17, 0), java.time.LocalTime.of(19, 0),
                        DEMO_ZONE.getId(), "ONLINE", 60),
                new AvailabilitySlot(user, 6, java.time.LocalTime.of(10, 0), java.time.LocalTime.of(13, 0),
                        DEMO_ZONE.getId(), "BOTH", 60)));
    }

    private void seedProgress(User user, String skill, int percent, String topic, LearningProgressRepository progress) {
        if (progress.findByUserOrderByIdDesc(user).stream().anyMatch(item -> item.getSkillName().equalsIgnoreCase(skill))) return;
        LearningProgress item = new LearningProgress(user, skill);
        item.update(percent, topic, "DEMO DATA: sample learning activity.", "Demo seed record.");
        progress.save(item);
    }

    private void seedCommunity(CommunityPostRepository posts, CommunityCommentRepository comments,
                               CommunityLikeRepository likes, User maya, User arjun, User lila, User noah) {
        if (posts.existsByAuthor_EmailEndingWith("@demo.skillbridge.local")) return;
        CommunityPost python = posts.save(new CommunityPost(maya,
                "I finally understand when to use a list versus a dictionary. What small Python concept clicked for you this week?", "Python"));
        CommunityPost spreadsheet = posts.save(new CommunityPost(lila,
                "A tidy spreadsheet makes analysis feel less intimidating. I put together a short checklist for cleaning columns before a lookup.", "Excel"));
        posts.save(new CommunityPost(noah,
                "I am practicing shorter UX interviews: one open question, then a quiet pause. What helps you make room for useful answers?", "UX Research"));
        comments.save(new CommunityComment(python, arjun, "The dictionary example helped me connect the idea to real interface data."));
        comments.save(new CommunityComment(spreadsheet, noah, "I would love to compare that with the way we organize user research notes."));
        likes.save(new CommunityLike(python, arjun));
        likes.save(new CommunityLike(spreadsheet, noah));
    }

    private record DemoPerson(String name, String email, String bio, String teaches, String teachingCategory,
                              String learns, String learningCategory) {}
}
