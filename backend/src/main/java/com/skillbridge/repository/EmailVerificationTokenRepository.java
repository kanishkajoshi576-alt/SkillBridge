package com.skillbridge.repository;

import com.skillbridge.model.EmailVerificationToken;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findByTokenHashAndConsumedFalse(String tokenHash);
    boolean existsByUserAndCreatedAtAfter(User user, Instant time);
    java.util.List<EmailVerificationToken> findByUserAndConsumedFalse(User user);
}
