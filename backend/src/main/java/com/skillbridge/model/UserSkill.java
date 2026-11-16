package com.skillbridge.model;

import jakarta.persistence.*;

@Entity
@Table(name = "user_skills", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "skill_id", "type"}))
public class UserSkill {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "skill_id")
    private Skill skill;
    @Column(nullable = false, length = 10)
    private String type;
    @Column(nullable = false, length = 20)
    private String level = "BEGINNER";
    protected UserSkill() {}
    public UserSkill(User user, Skill skill, String type) { this.user = user; this.skill = skill; this.type = type; }
    public Long getId() { return id; }
    public User getUser() { return user; }
    public Skill getSkill() { return skill; }
    public String getType() { return type; }
    public String getLevel() { return level; }
}
