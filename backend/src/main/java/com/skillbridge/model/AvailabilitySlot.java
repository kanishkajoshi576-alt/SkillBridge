package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "availability_slots", indexes = @Index(name = "idx_availability_user_day", columnList = "user_id, day_of_week"))
public class AvailabilitySlot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;
    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;
    @Column(name = "time_zone", nullable = false, length = 64)
    private String timeZone;
    @Column(nullable = false, length = 12)
    private String mode;
    @Column(name = "preferred_duration_minutes", nullable = false)
    private int preferredDurationMinutes;
    protected AvailabilitySlot() {}
    public AvailabilitySlot(User user, int dayOfWeek, LocalTime startTime, LocalTime endTime, String timeZone, String mode, int preferredDurationMinutes) {
        this.user = user; this.dayOfWeek = dayOfWeek; this.startTime = startTime; this.endTime = endTime;
        this.timeZone = timeZone; this.mode = mode; this.preferredDurationMinutes = preferredDurationMinutes;
    }
    public Long getId() { return id; }
    public int getDayOfWeek() { return dayOfWeek; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public String getTimeZone() { return timeZone; }
    public String getMode() { return mode; }
    public int getPreferredDurationMinutes() { return preferredDurationMinutes; }
}
