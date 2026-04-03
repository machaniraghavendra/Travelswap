package com.travelswap.repository;

import com.travelswap.entity.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {
    List<AuditLogEntity> findTop200ByOrderByCreatedAtDesc();
    List<AuditLogEntity> findByOrderByCreatedAtDesc(Pageable pageable);
}
