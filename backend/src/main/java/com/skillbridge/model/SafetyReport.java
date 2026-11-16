package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "reports", indexes = {
        @Index(name = "idx_reports_status_created", columnList = "status, created_at"),
        @Index(name = "idx_reports_reporter_created", columnList = "reporter_id, created_at")
})
public class SafetyReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "reporter_id")
    private User reporter;
    @Column(nullable = false, length = 40)
    private String category;
    @Column(length = 40)
    private String targetType = "PLATFORM";
    private Long targetId;
    @Column(length = 1000)
    private String description;
    @Column(nullable = false, length = 20)
    private String status = "PENDING";
    @Column(length = 500)
    private String adminAction;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected SafetyReport() {}
    public SafetyReport(User reporter, String category, String description, String targetType, Long targetId) {
        this.reporter = reporter; this.category = category; this.description = description;
        this.targetType = targetType; this.targetId = targetId;
    }
    public Long getId() { return id; }
    public User getReporter() { return reporter; }
    public String getCategory() { return category; }
    public String getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public String getDescription() { return description; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public String getAdminAction() { return adminAction; }
    public void resolve(String action) { this.status = "RESOLVED"; this.adminAction = action; }
}
