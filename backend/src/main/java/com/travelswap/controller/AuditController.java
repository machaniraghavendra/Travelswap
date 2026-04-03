package com.travelswap.controller;

import com.travelswap.audit.AuditService;
import com.travelswap.dto.AuditLogChunkResponse;
import com.travelswap.dto.AuditLogResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/logs")
    public List<AuditLogResponse> latestLogs(@RequestParam(defaultValue = "50") int limit) {
        return auditService.latest(limit);
    }

    @GetMapping("/logs/chunk")
    public AuditLogChunkResponse chunkedLogs(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return auditService.chunk(offset, limit);
    }
}
