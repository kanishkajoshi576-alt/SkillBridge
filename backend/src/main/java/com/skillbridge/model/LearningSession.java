package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "learning_sessions", indexes = @Index(name = "idx_sessions_date_status", columnList = "date, status"))
public class LearningSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "connection_id")
    private LearningConnection connection;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "created_by")
    private User createdBy;
    @Column(nullable = false, length = 120)
    private String title;
    @Column(nullable = false, length = 100)
    private String skillName;
    @Column(nullable = false)
    private LocalDate date;
    @Column(nullable = false, length = 20)
    private String startTime;
    @Column(nullable = false, length = 20)
    private String endTime;
    @Column(nullable = false, length = 64, columnDefinition = "varchar(64) default 'UTC'")
    private String timeZone = "UTC";
    @Column(length = 1200)
    private String notes;
    @Column(nullable = false, length = 20)
    private String status = "PENDING_CONFIRMATION";
    @Column(nullable = false)
    private boolean creatorConfirmedCompletion;
    @Column(nullable = false)
    private boolean partnerConfirmedCompletion;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected LearningSession() {}
    public LearningSession(LearningConnection connection, User createdBy, String title, String skillName, LocalDate date, String startTime, String endTime, String notes) {
        this(connection, createdBy, title, skillName, date, startTime, endTime, "UTC", notes);
    }
    public LearningSession(LearningConnection connection, User createdBy, String title, String skillName, LocalDate date, String startTime, String endTime, String timeZone, String notes) {
        this.connection = connection; this.createdBy = createdBy; this.title = title; this.skillName = skillName; this.date = date; this.startTime = startTime; this.endTime = endTime; this.timeZone = timeZone; this.notes = notes;
    }
    @PostLoad
    private void normalizeLegacyStatus() {
        if ("SCHEDULED".equals(status)) status = "UPCOMING";
    }
    public Long getId() { return id; }
    public LearningConnection getConnection() { return connection; }
    public User getCreatedBy() { return createdBy; }
    public String getTitle() { return title; }
    public String getSkillName() { return skillName; }
    public LocalDate getDate() { return date; }
    public String getStartTime() { return startTime; }
    public String getEndTime() { return endTime; }
    public String getTimeZone() { return timeZone; }
    public String getStatus() { return status; }
    public void reschedule(LocalDate date, String startTime, String endTime, String timeZone) {
        if (!("PENDING_CONFIRMATION".equals(status) || "UPCOMING".equals(status)))
            throw new IllegalStateException("Only a pending or upcoming session can be rescheduled.");
        this.date = date; this.startTime = startTime; this.endTime = endTime; this.timeZone = timeZone;
        this.status = "PENDING_CONFIRMATION";
        this.creatorConfirmedCompletion = false; this.partnerConfirmedCompletion = false;
    }
    public boolean isCreatedBy(User user) { return createdBy.getId().equals(user.getId()); }
    public boolean hasConfirmedCompletion(User user) {
        return isCreatedBy(user) ? creatorConfirmedCompletion : partnerConfirmedCompletion;
    }
    public void accept(User participant) {
        if (!"PENDING_CONFIRMATION".equals(status) || isCreatedBy(participant)) {
            throw new IllegalStateException("Only the other participant can accept a pending session.");
        }
        status = "UPCOMING";
    }
    public void start() {
        if (!"UPCOMING".equals(status)) throw new IllegalStateException("Only an upcoming session can be started.");
        status = "IN_PROGRESS";
    }
    public void cancel() {
        if ("COMPLETED".equals(status) || "COMPLETION_PENDING".equals(status) || "CANCELLED".equals(status)) {
            throw new IllegalStateException("This session can no longer be cancelled.");
        }
        status = "CANCELLED";
    }
    public void confirmCompletion(User participant) {
        if (!("UPCOMING".equals(status) || "IN_PROGRESS".equals(status) || "COMPLETION_PENDING".equals(status))) {
            throw new IllegalStateException("This session is not awaiting completion.");
        }
        if (isCreatedBy(participant)) {
            if (creatorConfirmedCompletion) throw new IllegalStateException("You have already confirmed this session.");
            creatorConfirmedCompletion = true;
        } else {
            if (partnerConfirmedCompletion) throw new IllegalStateException("You have already confirmed this session.");
            partnerConfirmedCompletion = true;
        }
        status = creatorConfirmedCompletion && partnerConfirmedCompletion ? "COMPLETED" : "COMPLETION_PENDING";
    }
}
