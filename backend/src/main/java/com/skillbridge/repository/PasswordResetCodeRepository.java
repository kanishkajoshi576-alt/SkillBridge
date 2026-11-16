package com.skillbridge.repository;

import com.skillbridge.model.PasswordResetCode;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, Long> {
    List<PasswordResetCode> findByUserAndConsumedFalse(User user);
    Optional<PasswordResetCode> findFirstByUserAndConsumedFalseOrderByCreatedAtDesc(User user);
    boolean existsByUserAndCreatedAtAfter(User user, Instant createdAt);
}
