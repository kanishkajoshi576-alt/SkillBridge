package com.skillbridge.config;

import com.skillbridge.repository.LearningConnectionRepository;
import com.skillbridge.repository.ChatMessageRepository;
import com.skillbridge.repository.LearningSessionRepository;
import com.skillbridge.repository.LearningProgressRepository;
import com.skillbridge.repository.AvailabilitySlotRepository;
import com.skillbridge.repository.ReviewRepository;
import com.skillbridge.repository.CommunityPostRepository;
import com.skillbridge.repository.UserRepository;
import com.skillbridge.repository.UserSkillRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.verify;

@SpringBootTest(properties = "skillbridge.demo.seed-enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles({"test", "demo"})
class DemoDataInitializerTest {
    @Autowired UserRepository users;
    @Autowired LearningConnectionRepository connections;
    @Autowired ChatMessageRepository messages;
    @Autowired LearningSessionRepository sessions;
    @Autowired LearningProgressRepository progress;
    @Autowired AvailabilitySlotRepository availabilitySlots;
    @Autowired ReviewRepository reviews;
    @Autowired CommunityPostRepository posts;
    @Autowired UserSkillRepository userSkills;
    @Autowired MockMvc mvc;
    @MockBean JavaMailSender mailSender;

    @Test
    void explicitDemoProfileSeedsLabeledAccountsAndAllowsDemoLogin() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.demoMode").value(true));
        var maya = users.findByEmailIgnoreCase("maya@demo.skillbridge.local").orElseThrow();
        var arjun = users.findByEmailIgnoreCase("arjun@demo.skillbridge.local").orElseThrow();
        var lila = users.findByEmailIgnoreCase("lila@demo.skillbridge.local").orElseThrow();
        var noah = users.findByEmailIgnoreCase("noah@demo.skillbridge.local").orElseThrow();
        var riya = users.findByEmailIgnoreCase("riya@demo.skillbridge.local").orElseThrow();
        assertThat(maya.getBio()).contains("DEMO ACCOUNT");
        assertThat(maya.getPhone()).startsWith("+1 202 555 01");
        assertThat(maya.getProfileImage()).contains("i.pravatar.cc");
        assertThat(maya.getCertifications()).contains("Python Foundations");
        assertThat(reviews.findByReviewedUserOrderByCreatedAtDesc(maya)).isNotEmpty();
        assertThat(arjun.getCollege()).contains("sample data");
        assertThat(users.findAll().stream()
                .filter(user -> user.getEmail().endsWith("@demo.skillbridge.local")))
                .hasSize(44);
        assertThat(userSkills.findByUser(riya)).hasSize(2);
        assertThat(connections.findByRequestSenderOrRequestReceiver(maya, maya)).isNotEmpty();
        var mayaConnection = connections.findByRequestSenderOrRequestReceiver(maya, maya).get(0);
        assertThat(connections.findByRequestSenderOrRequestReceiver(lila, lila)).isNotEmpty();
        assertThat(messages.findByConnectionOrderByCreatedAtAsc(mayaConnection)).hasSize(3);
        assertThat(sessions.findByConnectionInOrderByDateAsc(java.util.List.of(mayaConnection))).hasSize(6);
        assertThat(progress.findByUserOrderByIdDesc(maya))
                .extracting(com.skillbridge.model.LearningProgress::getSkillName)
                .containsAll(userSkills.findByUser(maya).stream()
                        .filter(skill -> "LEARN".equals(skill.getType()))
                        .map(skill -> skill.getSkill().getName()).toList());
        assertThat(availabilitySlots.findByUserOrderByDayOfWeekAscStartTimeAsc(maya)).hasSize(3);
        var demoAccounts = users.findAll().stream()
                .filter(user -> user.getEmail().endsWith("@demo.skillbridge.local"))
                .toList();
        for (var account : demoAccounts) {
            var accountConnections = connections.findByRequestSenderOrRequestReceiver(account, account);
            var accountSessions = sessions.findByConnectionInOrderByDateAsc(accountConnections);
            assertThat(userSkills.findByUser(account).stream().anyMatch(skill -> "TEACH".equals(skill.getType())))
                    .as("teaching skill for %s", account.getEmail()).isTrue();
            assertThat(userSkills.findByUser(account).stream().anyMatch(skill -> "LEARN".equals(skill.getType())))
                    .as("learning skill for %s", account.getEmail()).isTrue();
            assertThat(accountConnections.stream().anyMatch(connection -> "ACTIVE".equals(connection.getStatus())))
                    .as("active exchange for %s", account.getEmail()).isTrue();
            assertThat(accountConnections.stream()
                    .flatMap(connection -> messages.findByConnectionOrderByCreatedAtAsc(connection).stream()))
                    .as("inbox conversation for %s", account.getEmail()).isNotEmpty();
            assertThat(accountSessions.stream().anyMatch(session -> "COMPLETED".equals(session.getStatus())))
                    .as("completed session for %s", account.getEmail()).isTrue();
            assertThat(accountSessions.stream().anyMatch(session -> "UPCOMING".equals(session.getStatus())))
                    .as("upcoming session for %s", account.getEmail()).isTrue();
            assertThat(progress.findByUserOrderByIdDesc(account)).as("progress for %s", account.getEmail()).isNotEmpty();
            assertThat(availabilitySlots.findByUserOrderByDayOfWeekAscStartTimeAsc(account))
                    .as("availability for %s", account.getEmail()).hasSize(3);
        }
        assertThat(posts.findAll()).hasSize(3);

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"maya@demo.skillbridge.local\",\"password\":\"SkillBridgeDemo2026!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otpRequired").value(true));

        var mail = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mail.capture());
        var matcher = java.util.regex.Pattern.compile("\\b(\\d{6})\\b").matcher(mail.getValue().getText());
        assertThat(matcher.find()).isTrue();
        mvc.perform(post("/api/auth/login/verify").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"maya@demo.skillbridge.local\",\"code\":\"" + matcher.group(1) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    @WithMockUser(username = "maya@demo.skillbridge.local")
    void demoMatchesIncludeMultipleComplementaryPeople() throws Exception {
        mvc.perform(get("/api/matches").param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(43))
                .andExpect(jsonPath("$.items[?(@.name == 'Riya Kapoor')]").exists())
                .andExpect(jsonPath("$.items[?(@.name == 'Ethan Brooks')]").exists())
                .andExpect(jsonPath("$.items[?(@.name == 'Zoe Park')]").exists())
                .andExpect(jsonPath("$.items[?(@.name == 'Jayden Brooks')]").exists())
                .andExpect(jsonPath("$.items[?(@.name == 'Callum Hayes')]").exists());
    }

    @Test
    @WithMockUser(username = "maya@demo.skillbridge.local")
    void dashboardIncludesPersonalSkillsAndCalendarPlanCounts() throws Exception {
        String response = mvc.perform(get("/api/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teachingSkillNames").isArray())
                .andExpect(jsonPath("$.learningSkillNames").isArray())
                .andExpect(jsonPath("$.teachingSkillNames").value(org.hamcrest.Matchers.hasItem("Python")))
                .andExpect(jsonPath("$.learningSkillNames").value(org.hamcrest.Matchers.hasItem("UI Design")))
                .andExpect(jsonPath("$.teachingSkills").value(9))
                .andExpect(jsonPath("$.learningSkills").value(8))
                .andExpect(jsonPath("$.activeExchanges").value(8))
                .andExpect(jsonPath("$.plannedSessions").value(8))
                .andExpect(jsonPath("$.completedSessions").value(9))
                .andExpect(jsonPath("$.upcomingSessions.length()").value(5))
                .andReturn().getResponse().getContentAsString();
        var dashboard = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response);
        assertThat(dashboard.path("teachingSkills").asInt()).isEqualTo(dashboard.path("teachingSkillNames").size());
        assertThat(dashboard.path("learningSkills").asInt()).isEqualTo(dashboard.path("learningSkillNames").size());
    }

    @Test
    @WithMockUser(username = "maya@demo.skillbridge.local")
    void publicDemoProfilesIncludeSampleDetailsAndPrivacyControlledContact() throws Exception {
        var arjun = users.findByEmailIgnoreCase("arjun@demo.skillbridge.local").orElseThrow();
        mvc.perform(get("/api/users/" + arjun.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profileImage").value(org.hamcrest.Matchers.containsString("i.pravatar.cc")))
                .andExpect(jsonPath("$.phone").value(org.hamcrest.Matchers.startsWith("+1 202 555 01")))
                .andExpect(jsonPath("$.certifications").value(org.hamcrest.Matchers.containsString("UI Design")))
                .andExpect(jsonPath("$.averageRating").isNumber())
                .andExpect(jsonPath("$.reviewCount").value(org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.memberSince").value(2023));
    }

    @Test
    @WithMockUser(username = "callum@demo.skillbridge.local")
    void everyDemoLearnerHasDashboardPlansAndLearningProgress() throws Exception {
        mvc.perform(get("/api/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teachingSkills").value(1))
                .andExpect(jsonPath("$.learningSkills").value(1))
                .andExpect(jsonPath("$.activeExchanges").value(1))
                .andExpect(jsonPath("$.plannedSessions").value(2))
                .andExpect(jsonPath("$.completedSessions").value(1))
                .andExpect(jsonPath("$.upcomingSessions.length()").value(2));
        mvc.perform(get("/api/progress"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].skillName").value("Cooking"));
    }
}
