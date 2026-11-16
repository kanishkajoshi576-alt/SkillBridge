package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_blocks", uniqueConstraints = @UniqueConstraint(columnNames = {"blocker_id", "blocked_id"}))
public class UserBlock {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "blocker_id")
    private User blocker;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "blocked_id")
    private User blocked;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected UserBlock() {}
    public UserBlock(User blocker, User blocked) { this.blocker = blocker; this.blocked = blocked; }
    public Long getId() { return id; }
    public User getBlocker() { return blocker; }
    public User getBlocked() { return blocked; }
}
