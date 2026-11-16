package com.skillbridge.service;

import com.skillbridge.model.ExchangeRequest;
import com.skillbridge.model.LearningConnection;
import com.skillbridge.model.LearningSession;
import com.skillbridge.model.Notification;
import com.skillbridge.model.User;
import com.skillbridge.repository.LearningSessionRepository;
import com.skillbridge.repository.NotificationRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

@Service
public class SessionReminderService {
    private final LearningSessionRepository sessions;
    private final NotificationRepository notifications;

    public SessionReminderService(LearningSessionRepository sessions, NotificationRepository notifications) {
        this.sessions = sessions;
        this.notifications = notifications;
    }

    @Scheduled(fixedDelayString = "${skillbridge.sessions.reminder-scan-ms:60000}")
    @Transactional
    public void createUpcomingSessionReminders() {
        Instant now = Instant.now();
        LocalDate today = LocalDate.now(ZoneId.of("UTC"));
        List<LearningSession> upcoming = sessions.findByDateBetweenAndStatusIn(today.minusDays(1), today.plusDays(2), List.of("UPCOMING"));
        for (LearningSession session : upcoming) {
            Instant startsAt;
            try {
                startsAt = LocalDateTimeAt(session.getDate(), session.getStartTime(), session.getTimeZone());
            } catch (RuntimeException invalidLegacyTime) {
                continue;
            }
            if (!startsAt.isAfter(now)) continue;
            createReminderIfDue(session, startsAt, now, 24, "SESSION_REMINDER_24H", "Session tomorrow");
            createReminderIfDue(session, startsAt, now, 1, "SESSION_REMINDER_1H", "Session in one hour");
        }
    }

    private void createReminderIfDue(LearningSession session, Instant startsAt, Instant now, int hours, String type, String title) {
        Duration until = Duration.between(now, startsAt);
        Duration threshold = Duration.ofHours(hours);
        if (until.isNegative() || until.compareTo(threshold.minus(Duration.ofMinutes(1))) < 0 || until.compareTo(threshold) > 0) return;
        LearningConnection connection = session.getConnection();
        ExchangeRequest request = connection.getRequest();
        String message = "Session " + session.getId() + " starts at " + session.getStartTime() + " (" + session.getTimeZone() + ").";
        for (User participant : List.of(request.getSender(), request.getReceiver())) {
            if (!notifications.existsByUserAndTypeAndMessage(participant, type, message)) {
                notifications.save(new Notification(participant, type, title, message));
            }
        }
    }

    private Instant LocalDateTimeAt(LocalDate date, String time, String zone) {
        return java.time.LocalDateTime.of(date, LocalTime.parse(time)).atZone(ZoneId.of(zone)).toInstant();
    }
}
