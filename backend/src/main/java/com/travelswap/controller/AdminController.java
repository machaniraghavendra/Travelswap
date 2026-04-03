package com.travelswap.controller;

import com.travelswap.dto.AdminOverviewResponse;
import com.travelswap.service.AdminOverviewService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminOverviewService adminOverviewService;

    public AdminController(AdminOverviewService adminOverviewService) {
        this.adminOverviewService = adminOverviewService;
    }

    @GetMapping("/overview")
    public AdminOverviewResponse overview() {
        return adminOverviewService.overview();
    }
}
