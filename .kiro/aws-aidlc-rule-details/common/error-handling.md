# Error Handling Guide

**Purpose**: Define error handling patterns for the workflow and generated code.

## Workflow Error Handling

### If a stage fails:
1. Document the failure in audit.md
2. Identify root cause
3. Propose fix or alternative approach
4. Get user approval before retrying

### If user provides unclear input:
1. Ask clarifying questions (follow question-format-guide.md)
2. Do not assume or guess
3. Wait for clear answer before proceeding

## Code Error Handling Patterns

### Go Backend (Thiên Đạo Game)

**Service Layer**:
```go
// Always return errors, never panic
func (s *gachaService) Roll(ctx context.Context, userID uint) (*GachaResult, error) {
    if userID == 0 {
        return nil, fmt.Errorf("invalid user ID: %d", userID)
    }
    // ... business logic
    if err != nil {
        return nil, fmt.Errorf("gacha roll failed for user %d: %w", userID, err)
    }
    return result, nil
}
```

**Handler Layer**:
```go
// Map errors to HTTP status codes
func (h *GachaHandler) Roll(c *gin.Context) {
    result, err := h.service.Roll(c.Request.Context(), userID)
    if err != nil {
        slog.Error("gacha roll failed", "error", err, "userID", userID)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Quay thất bại"})
        return
    }
    c.JSON(http.StatusOK, result)
}
```

**Repository Layer**:
```go
// Wrap GORM errors with context
func (r *userRepo) FindByID(ctx context.Context, id uint) (*model.User, error) {
    var user model.User
    if err := r.db.WithContext(ctx).First(&user, id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, fmt.Errorf("user not found: %d", id)
        }
        return nil, fmt.Errorf("find user %d: %w", id, err)
    }
    return &user, nil
}
```

### React Frontend

**API Service**:
```typescript
// Centralized error handling in axios interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Component Level**:
```typescript
// Use try-catch with user-friendly messages
const handleRoll = async () => {
  try {
    setLoading(true);
    const result = await gachaService.roll();
    setResult(result);
  } catch (error) {
    toast.error('Quay thất bại, vui lòng thử lại');
  } finally {
    setLoading(false);
  }
};
```

## Game-Specific Error Cases

| Scenario | Backend Response | Frontend Display |
|----------|-----------------|-----------------|
| Not enough Tiên Ngọc | 400 + error message | "Không đủ Tiên Ngọc" |
| Character not found | 404 | "Đệ tử không tồn tại" |
| Equipment already equipped | 409 | "Trang bị đã được sử dụng" |
| Combat in progress | 429 | "Đang trong trận đấu" |
| Server error | 500 | "Lỗi hệ thống, thử lại sau" |
