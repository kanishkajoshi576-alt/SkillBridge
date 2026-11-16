package com.skillbridge.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CoreExchangeFlowTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @MockBean JavaMailSender mailSender;

    @BeforeEach
    void resetMailSender() { reset(mailSender); }

    @Test
    void registrationIsPublicAndRejectsInvalidJsonAsBadRequest() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"email\":\"\",\"password\":\"\",\"college\":\"\"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{name:\"Kanishka\",email:\"kanishka@example.test\",password:\"correct-horse-battery-1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST_BODY"));
    }

    @Test
    void userCanResetPasswordWithOneTimeEmailCode() throws Exception {
        String email = "password-reset-" + UUID.randomUUID() + "@example.test";
        register("Password Reset User", email);

        mvc.perform(post("/api/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("If an account exists, a reset code was sent or a recent code is still valid. Codes expire after 10 minutes."));

        org.mockito.ArgumentCaptor<SimpleMailMessage> emailCaptor =
                org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(emailCaptor.capture());
        Matcher codeMatcher = Pattern.compile("\\b(\\d{6})\\b").matcher(emailCaptor.getValue().getText());
        assertThat(codeMatcher.find()).isTrue();
        String code = codeMatcher.group(1);

        mvc.perform(post("/api/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "code", code, "newPassword", "new-correct-horse-1"))))
                .andExpect(status().isOk());

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", "new-correct-horse-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otpRequired").value(true))
                .andReturn();

        org.mockito.ArgumentCaptor<SimpleMailMessage> loginEmailCaptor =
                org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, org.mockito.Mockito.times(2)).send(loginEmailCaptor.capture());
        Matcher loginCodeMatcher = Pattern.compile("\\b(\\d{6})\\b")
                .matcher(loginEmailCaptor.getAllValues().get(1).getText());
        assertThat(loginCodeMatcher.find()).isTrue();
        String loginCode = loginCodeMatcher.group(1);

        mvc.perform(post("/api/auth/login/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "code", loginCode))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        mvc.perform(post("/api/auth/login/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "code", loginCode))))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "code", code, "newPassword", "another-correct-horse-1"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginRequiresOneTimeEmailCodeAndRejectsCodeReuse() throws Exception {
        String email = "login-otp-" + UUID.randomUUID() + "@example.test";
        register("Login OTP User", email);

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", "correct-horse-battery-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otpRequired").value(true))
                .andExpect(jsonPath("$.message").value("A six-digit sign-in code was sent to your email address. It expires in 10 minutes."));

        org.mockito.ArgumentCaptor<SimpleMailMessage> emailCaptor =
                org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(emailCaptor.capture());
        Matcher codeMatcher = Pattern.compile("\\b(\\d{6})\\b").matcher(emailCaptor.getValue().getText());
        assertThat(codeMatcher.find()).isTrue();
        String code = codeMatcher.group(1);
        String wrongCode = code.equals("000000") ? "000001" : "000000";

        mvc.perform(post("/api/auth/login/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "code", wrongCode))))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/auth/login/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "code", code))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        mvc.perform(post("/api/auth/login/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "code", code))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void usersCanCompleteAReciprocalExchangeAndTrackLearning() throws Exception {
        JsonNode kanishka = register("Kanishka Joshi", "kanishka@example.test");
        JsonNode mira = register("Mira Singh", "mira@example.test");
        String kanishkaToken = kanishka.path("token").asText();
        String miraToken = mira.path("token").asText();

        updateSkills(kanishkaToken, "Kanishka Joshi", "Python", "UI Design");
        updateSkills(miraToken, "Mira Singh", "UI Design", "Python");

        mvc.perform(get("/api/matches").header("Authorization", bearer(kanishkaToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].matchScore").value(100))
                .andExpect(jsonPath("$.items[0].reasons.length()").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalItems").value(1));

        MvcResult requestResult = mvc.perform(post("/api/exchange-requests")
                        .header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("receiverId", mira.path("user").path("id").asLong(), "message", "Let's learn together."))))
                .andExpect(status().isCreated()).andReturn();
        long requestId = mapper.readTree(requestResult.getResponse().getContentAsString()).path("id").asLong();

        mvc.perform(put("/api/exchange-requests/{id}/accept", requestId)
                        .header("Authorization", bearer(miraToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        MvcResult conversations = mvc.perform(get("/api/conversations").header("Authorization", bearer(kanishkaToken)))
                .andExpect(status().isOk()).andReturn();
        long connectionId = mapper.readTree(conversations.getResponse().getContentAsString()).get(0).path("id").asLong();

        mvc.perform(post("/api/messages").header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("connectionId", connectionId, "message", "Ready to start?"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Ready to start?"));

        mvc.perform(get("/api/conversations").header("Authorization", bearer(miraToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].unreadCount").value(1));
        mvc.perform(put("/api/conversations/{id}/read", connectionId).header("Authorization", bearer(miraToken)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/messages").header("Authorization", bearer(kanishkaToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].read").value(true));

        LocalDate sessionDate = LocalDate.now().plusDays(1);
        int sessionWeekday = sessionDate.getDayOfWeek().getValue();
        mvc.perform(put("/api/availability").header("Authorization", bearer(miraToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("slots", java.util.List.of(Map.of("dayOfWeek", sessionWeekday,
                                "startTime", "12:00", "endTime", "13:00", "timeZone", "UTC", "mode", "ONLINE",
                                "preferredDurationMinutes", 60))))))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].timeZone").value("UTC"));

        mvc.perform(post("/api/sessions").header("Authorization", bearer(miraToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("connectionId", connectionId, "title", "Python foundations",
                                "skillName", "Python", "date", sessionDate.toString(),
                                "startTime", "10:00", "endTime", "11:00", "notes", ""))))
                .andExpect(status().isConflict());

        MvcResult sessionResult = mvc.perform(post("/api/sessions").header("Authorization", bearer(miraToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("connectionId", connectionId, "title", "Python foundations",
                                "skillName", "Python", "date", sessionDate.toString(),
                                "startTime", "12:00", "endTime", "13:00", "notes", ""))))
                .andExpect(status().isCreated()).andReturn();
        long sessionId = mapper.readTree(sessionResult.getResponse().getContentAsString()).path("id").asLong();

        mvc.perform(patch("/api/sessions/{id}", sessionId).header("Authorization", bearer(miraToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "ACCEPTED"))))
                .andExpect(status().isConflict());
        mvc.perform(patch("/api/sessions/{id}", sessionId).header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "ACCEPTED"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UPCOMING"));

        jdbcTemplate.update("UPDATE learning_sessions SET date = ? WHERE id = ?",
                LocalDate.now().minusDays(1), sessionId);

        mvc.perform(patch("/api/sessions/{id}", sessionId).header("Authorization", bearer(miraToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "COMPLETED"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETION_PENDING"));

        mvc.perform(post("/api/reviews").header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("connectionId", connectionId, "rating", 5, "reviewText", "A clear and kind teacher."))))
                .andExpect(status().isConflict());

        mvc.perform(patch("/api/sessions/{id}", sessionId).header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "COMPLETED"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"));

        mvc.perform(post("/api/reviews").header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("connectionId", connectionId, "rating", 5, "reviewText", "A clear and kind teacher."))))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/reviews").header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("connectionId", connectionId, "rating", 4, "reviewText", "Duplicate"))))
                .andExpect(status().isConflict());

        mvc.perform(post("/api/progress").header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("skillName", "Python", "progressPercentage", 25, "currentTopic", "Loops"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.progressPercentage").value(25));

        MvcResult notificationResult = mvc.perform(get("/api/notifications").header("Authorization", bearer(miraToken)))
                .andExpect(status().isOk()).andReturn();
        assertThat(mapper.readTree(notificationResult.getResponse().getContentAsString()).findValuesAsText("type"))
                .contains("MESSAGE", "SESSION");
        mvc.perform(get("/api/messages").header("Authorization", bearer(miraToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].message").value("Ready to start?"));

        mvc.perform(patch("/api/connections/{id}", connectionId).header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "PAUSED"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PAUSED"));
        mvc.perform(post("/api/messages").header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("connectionId", connectionId, "message", "This should be blocked."))))
                .andExpect(status().isConflict());
        mvc.perform(patch("/api/connections/{id}", connectionId).header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "ACTIVE"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(patch("/api/connections/{id}", connectionId).header("Authorization", bearer(miraToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "COMPLETED"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"));
        mvc.perform(patch("/api/connections/{id}", connectionId).header("Authorization", bearer(miraToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("status", "ACTIVE"))))
                .andExpect(status().isConflict());

        mvc.perform(post("/api/reports").header("Authorization", bearer(kanishkaToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("category", "OTHER", "description", "A test safety report.",
                                "targetType", "USER", "targetId", mira.path("user").path("id").asLong()))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"));
        mvc.perform(post("/api/users/{id}/block", mira.path("user").path("id").asLong())
                        .header("Authorization", bearer(kanishkaToken)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/blocks").header("Authorization", bearer(kanishkaToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Mira Singh"));
        mvc.perform(delete("/api/users/{id}/block", mira.path("user").path("id").asLong())
                        .header("Authorization", bearer(kanishkaToken)))
                .andExpect(status().isNoContent());

        assertThat(mira.path("user").path("email").asText()).isEqualTo("mira@example.test");
    }

    @Test
    void protectedEndpointsRequireAuthentication() throws Exception {
        mvc.perform(get("/api/dashboard")).andExpect(status().isUnauthorized());
    }

    @Test
    void privacyPreferencesArePersistedAndEnforcedByProfileAndRequestApis() throws Exception {
        JsonNode owner = register("Private Learner", "private@example.test");
        JsonNode visitor = register("Curious Learner", "curious@example.test");
        String ownerToken = owner.path("token").asText();
        String visitorToken = visitor.path("token").asText();
        long ownerId = owner.path("user").path("id").asLong();

        mvc.perform(get("/api/privacy").header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.profileVisible").value(true));
        mvc.perform(put("/api/privacy").header("Authorization", bearer(ownerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("profileVisible", false, "allowExchangeRequests", false, "allowMessages", false))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.allowExchangeRequests").value(false));
        mvc.perform(get("/api/users/{id}", ownerId).header("Authorization", bearer(visitorToken)))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/exchange-requests").header("Authorization", bearer(visitorToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("receiverId", ownerId))))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/privacy").header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.profileVisible").value(false));
    }

    @Test
    void communityPostsCommentsLikesAndOwnershipAreBackedByTheApi() throws Exception {
        JsonNode author = register("Community Author", "community-author@example.test");
        JsonNode member = register("Community Member", "community-member@example.test");
        String authorToken = author.path("token").asText();
        String memberToken = member.path("token").asText();

        MvcResult created = mvc.perform(post("/api/community/posts").header("Authorization", bearer(authorToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("body", "I am practicing recursion today.", "skillTag", "Python"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.body").value("I am practicing recursion today."))
                .andReturn();
        long postId = mapper.readTree(created.getResponse().getContentAsString()).path("id").asLong();

        mvc.perform(get("/api/community/posts").header("Authorization", bearer(memberToken)).param("query", "python"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(post("/api/community/posts/{id}/like", postId).header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.liked").value(true)).andExpect(jsonPath("$.likeCount").value(1));
        mvc.perform(post("/api/community/posts/{id}/comments", postId).header("Authorization", bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("body", "Great learning goal!"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.body").value("Great learning goal!"));
        mvc.perform(put("/api/community/posts/{id}", postId).header("Authorization", bearer(memberToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("body", "Changed by another member"))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/community/posts/{id}/report", postId).header("Authorization", bearer(memberToken)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"));
        mvc.perform(delete("/api/community/posts/{id}", postId).header("Authorization", bearer(authorToken)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/community/posts").header("Authorization", bearer(memberToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void doubtSolverReturnsAnExplicitErrorWhenProviderIsNotConfigured() throws Exception {
        JsonNode user = register("Learner Example", "learner@example.test");
        String token = user.path("token").asText();
        mvc.perform(post("/api/ai/doubt").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("question", "Explain linked lists."))))
                .andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/ai/conversations").header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    private JsonNode register(String name, String email) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", name, "email", email, "password", "correct-horse-battery-1", "college", "Sharda University"))))
                .andExpect(status().isCreated()).andReturn();
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    private void updateSkills(String token, String name, String teaches, String learns) throws Exception {
        mvc.perform(put("/api/profile").header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", name, "college", "Sharda University", "bio", "Here to share and learn.",
                                "teachingSkills", new String[]{teaches}, "learningSkills", new String[]{learns}))))
                .andExpect(status().isOk());
    }

    private String bearer(String token) { return "Bearer " + token; }
    private String json(Object value) throws Exception { return mapper.writeValueAsString(value); }
}
