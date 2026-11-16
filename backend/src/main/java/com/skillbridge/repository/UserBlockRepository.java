package com.skillbridge.repository;

import com.skillbridge.model.User;
import com.skillbridge.model.UserBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserBlockRepository extends JpaRepository<UserBlock, Long> {
    boolean existsByBlockerAndBlocked(User blocker, User blocked);
    List<UserBlock> findByBlocker(User blocker);
    List<UserBlock> findByBlocked(User blocked);
    Optional<UserBlock> findByBlockerAndBlocked(User blocker, User blocked);
}
