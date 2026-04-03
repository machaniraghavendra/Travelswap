package com.travelswap.controller;

import com.travelswap.dto.BusResponse;
import com.travelswap.dto.CreateBusRequest;
import com.travelswap.dto.TravelResponse;
import com.travelswap.service.TravelManagementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/travels")
@PreAuthorize("hasRole('TRAVEL')")
public class TravelController {

    private final TravelManagementService travelManagementService;

    public TravelController(TravelManagementService travelManagementService) {
        this.travelManagementService = travelManagementService;
    }

    @GetMapping
    public List<TravelResponse> myTravels() {
        return travelManagementService.myTravels();
    }

    @PostMapping("/{travelId}/buses")
    @ResponseStatus(HttpStatus.CREATED)
    public BusResponse createBus(@PathVariable Long travelId, @Valid @RequestBody CreateBusRequest request) {
        return travelManagementService.createBus(travelId, request);
    }

    @PutMapping("/{travelId}/buses/{busId}")
    public BusResponse updateBus(
            @PathVariable Long travelId,
            @PathVariable Long busId,
            @Valid @RequestBody CreateBusRequest request
    ) {
        return travelManagementService.updateBus(travelId, busId, request);
    }

    @GetMapping("/{travelId}/buses")
    public List<BusResponse> busesByTravel(@PathVariable Long travelId) {
        return travelManagementService.busesForTravel(travelId);
    }
}
