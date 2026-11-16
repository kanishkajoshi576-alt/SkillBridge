package com.skillbridge.repository;

import com.skillbridge.model.LearningSession;
import com.skillbridge.model.LearningConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.time.LocalDate;
import java.util.Collection;

public interface LearningSessionRepository extends JpaRepository<LearningSession, Long> {
    List<LearningSession> findByConnectionInOrderByDateAsc(List<LearningConnection> connections);
    List<LearningSession> findByConnectionInAndDate(List<LearningConnection> connections, LocalDate date);
    List<LearningSession> findByDateBetweenAndStatusIn(LocalDate start, LocalDate end, Collection<String> statuses);
}
