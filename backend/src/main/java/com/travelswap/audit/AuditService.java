package com.travelswap.audit;

import com.travelswap.dto.AuditLogResponse;
import com.travelswap.dto.AuditLogChunkResponse;
import com.travelswap.entity.AuditLogEntity;
import com.travelswap.entity.UserEntity;
import com.travelswap.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import org.springframework.data.domain.PageRequest;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(String action, boolean success, int statusCode, UserEntity actor, String endpoint,
                       String message, Long listingId, String sessionId) {
        AuditLogEntity entry = new AuditLogEntity();
        entry.setAction(action);
        entry.setSuccess(success);
        entry.setStatusCode(statusCode);
        entry.setActorEmail(actor == null ? "anonymous" : actor.getEmail());
        entry.setActorRole(actor == null ? "ANONYMOUS" : actor.getRole().name());
        entry.setEndpoint(endpoint == null ? "N/A" : endpoint);
        entry.setMessage(message);
        entry.setListingId(listingId);
        entry.setSessionId(sessionId);
        auditLogRepository.save(entry);

        if (success) {
            log.info("AUDIT action={} actor={} status={} endpoint={} listingId={} message={}",
                    action,
                    entry.getActorEmail(),
                    statusCode,
                    entry.getEndpoint(),
                    listingId,
                    message == null ? "" : message);
        } else {
            log.error("AUDIT action={} actor={} status={} endpoint={} listingId={} message={}",
                    action,
                    entry.getActorEmail(),
                    statusCode,
                    entry.getEndpoint(),
                    listingId,
                    message == null ? "" : message);
        }
    }

    public List<AuditLogResponse> latest(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 200));
        return auditLogRepository.findTop200ByOrderByCreatedAtDesc()
                .stream()
                .limit(safeLimit)
                .map(logEntry -> new AuditLogResponse(
                        logEntry.getId(),
                        logEntry.getAction(),
                        logEntry.isSuccess(),
                        logEntry.getStatusCode(),
                        logEntry.getActorEmail(),
                        logEntry.getActorRole(),
                        logEntry.getEndpoint(),
                        logEntry.getMessage(),
                        logEntry.getListingId(),
                        logEntry.getSessionId(),
                        logEntry.getCreatedAt()
                ))
                .toList();
    }

    public AuditLogChunkResponse chunk(int offset, int limit) {
        int safeOffset = Math.max(0, offset);
        int safeLimit = Math.max(1, Math.min(limit, 100));
        int page = safeOffset / safeLimit;

        List<AuditLogResponse> items = auditLogRepository.findByOrderByCreatedAtDesc(PageRequest.of(page, safeLimit))
                .stream()
                .map(logEntry -> new AuditLogResponse(
                        logEntry.getId(),
                        logEntry.getAction(),
                        logEntry.isSuccess(),
                        logEntry.getStatusCode(),
                        logEntry.getActorEmail(),
                        logEntry.getActorRole(),
                        logEntry.getEndpoint(),
                        logEntry.getMessage(),
                        logEntry.getListingId(),
                        logEntry.getSessionId(),
                        logEntry.getCreatedAt()
                ))
                .toList();

        boolean hasMore = items.size() == safeLimit;
        return new AuditLogChunkResponse(items, safeOffset, safeLimit, hasMore);
    }
}
