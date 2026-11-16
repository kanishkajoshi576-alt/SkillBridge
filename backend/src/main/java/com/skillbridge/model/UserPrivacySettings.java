package com.skillbridge.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class UserPrivacySettings {
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean profileVisible = true;
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean locationVisible = true;
    @Column(nullable = false)
    private boolean emailVisible;
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean phoneVisible;
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean skillsVisible = true;
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean availabilityVisible = true;
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean allowExchangeRequests = true;
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean allowMessages = true;

    public boolean isProfileVisible() { return profileVisible; }
    public void setProfileVisible(boolean value) { profileVisible = value; }
    public boolean isLocationVisible() { return locationVisible; }
    public void setLocationVisible(boolean value) { locationVisible = value; }
    public boolean isEmailVisible() { return emailVisible; }
    public void setEmailVisible(boolean value) { emailVisible = value; }
    public boolean isPhoneVisible() { return phoneVisible; }
    public void setPhoneVisible(boolean value) { phoneVisible = value; }
    public boolean isSkillsVisible() { return skillsVisible; }
    public void setSkillsVisible(boolean value) { skillsVisible = value; }
    public boolean isAvailabilityVisible() { return availabilityVisible; }
    public void setAvailabilityVisible(boolean value) { availabilityVisible = value; }
    public boolean isAllowExchangeRequests() { return allowExchangeRequests; }
    public void setAllowExchangeRequests(boolean value) { allowExchangeRequests = value; }
    public boolean isAllowMessages() { return allowMessages; }
    public void setAllowMessages(boolean value) { allowMessages = value; }
}
