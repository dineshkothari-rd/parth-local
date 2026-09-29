package com.nearkart.customer;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ReportRepository extends JpaRepository<Report, UUID> {}
