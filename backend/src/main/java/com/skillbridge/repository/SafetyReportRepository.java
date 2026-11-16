package com.skillbridge.repository;

import com.skillbridge.model.SafetyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SafetyReportRepository extends JpaRepository<SafetyReport, Long> {
    List<SafetyReport> findByOrderByCreatedAtDesc();
}
