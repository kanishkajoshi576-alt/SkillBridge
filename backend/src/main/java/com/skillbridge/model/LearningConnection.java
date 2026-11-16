package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "connections", uniqueConstraints = @UniqueConstraint(columnNames = {"request_id"}))
public class LearningConnection {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "request_id")
    private ExchangeRequest request;
    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected LearningConnection() {}
    public LearningConnection(ExchangeRequest request) { this.request = request; }
    public Long getId() { return id; }
    public ExchangeRequest getRequest() { return request; }
    public String getStatus() { return status; }
    public void transitionTo(String nextStatus) {
        boolean allowed = ("ACTIVE".equals(status) && ("PAUSED".equals(nextStatus) || "COMPLETED".equals(nextStatus)))
                || ("PAUSED".equals(status) && ("ACTIVE".equals(nextStatus) || "COMPLETED".equals(nextStatus)));
        if (!allowed) throw new IllegalStateException("That exchange transition is not allowed.");
        status = nextStatus;
    }
}
