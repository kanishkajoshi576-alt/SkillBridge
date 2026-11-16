package com.skillbridge.model;

import jakarta.persistence.*;

@Entity
@Table(name = "learning_progress", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "skill_name"}))
public class LearningProgress {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;
    @Column(nullable = false, length = 100)
    private String skillName;
    @Column(nullable = false)
    private int progressPercentage = 0;
    @Column(length = 120)
    private String currentTopic;
    @Column(length = 2000)
    private String completedTopics = "";
    @Column(length = 1200)
    private String notes = "";
    protected LearningProgress() {}
    public LearningProgress(User user, String skillName) { this.user = user; this.skillName = skillName; }
    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getSkillName() { return skillName; }
    public int getProgressPercentage() { return progressPercentage; }
    public String getCurrentTopic() { return currentTopic; }
    public void update(int progressPercentage, String currentTopic, String completedTopics, String notes) {
        this.progressPercentage = progressPercentage;
        this.currentTopic = currentTopic;
        this.completedTopics = completedTopics;
        this.notes = notes;
    }
}
