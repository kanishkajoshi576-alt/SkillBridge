package com.skillbridge.repository;

import com.skillbridge.model.User;
import com.skillbridge.model.UserSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserSkillRepository extends JpaRepository<UserSkill, Long> {
    List<UserSkill> findByUser(User user);
    List<UserSkill> findByUserAndType(User user, String type);
    void deleteByUser(User user);
}
