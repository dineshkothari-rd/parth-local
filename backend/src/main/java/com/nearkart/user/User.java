package com.nearkart.user;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

	@Id
	private UUID id;
	private String email;
	private String passwordHash;
	private int authVersion;
	private String displayName;

	@Enumerated(EnumType.STRING)
	private UserStatus status;

	@ManyToMany(fetch = FetchType.EAGER)
	@JoinTable(name = "user_roles",
		joinColumns = @JoinColumn(name = "user_id"),
		inverseJoinColumns = @JoinColumn(name = "role_id"))
	private Set<Role> roles = new HashSet<>();

	private Instant createdAt;
	private Instant updatedAt;

	protected User() {
	}

	public User(String email, String passwordHash, String displayName, Role role, Instant now) {
		this.id = UUID.randomUUID();
		this.email = email;
		this.passwordHash = passwordHash;
		this.displayName = displayName;
		this.status = UserStatus.ACTIVE;
		this.roles.add(role);
		this.createdAt = now;
		this.updatedAt = now;
	}

	@PreUpdate
	void touch() {
		updatedAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public int getAuthVersion() { return authVersion; }

	public String getEmail() {
		return email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public String getDisplayName() {
		return displayName;
	}

	public UserStatus getStatus() {
		return status;
	}

	public Set<Role> getRoles() {
		return Set.copyOf(roles);
	}

	public boolean addRole(Role role) {
		return roles.add(role);
	}
}
