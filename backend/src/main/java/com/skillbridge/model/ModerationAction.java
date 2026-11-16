package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "moderation_actions")
public class ModerationAction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "admin_id")
    private User admin;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "report_id")
    private SafetyReport report;
    @Column(nullable = false, length = 30)
    private String action;
    @Column(length = 500)
    private String notes;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected ModerationAction() {}
    public ModerationAction(User admin, SafetyReport report, String action, String notes) {
        this.admin = admin; this.report = report; this.action = action; this.notes = notes;
    }
}
