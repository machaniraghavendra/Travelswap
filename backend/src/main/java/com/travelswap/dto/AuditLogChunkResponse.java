package com.travelswap.dto;

import java.util.List;

public record AuditLogChunkResponse(
        List<AuditLogResponse> items,
        int offset,
        int limit,
        boolean hasMore
) {
}
