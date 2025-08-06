# Tower Block Competition Metrics System

## Overview

This enhanced scoring system provides multiple metrics to rank players precisely, even when they reach the same level. The system tracks **15 different performance indicators** including area-based metrics to create a comprehensive leaderboard.

## Ranking Algorithm (Priority Order)

### 1. **Level (Primary Metric)**

- **Description**: Number of successfully placed blocks
- **Range**: 0 to unlimited
- **Higher is better**

### 2. **Total Precision Score (Tie-breaker #1)**

- **Description**: Sum of all block placement accuracy scores
- **Calculation**: Each block placement scores 0-1000 points based on overlap percentage
- **Perfect placement**: 1000 points
- **90% overlap**: 900 points
- **50% overlap**: 500 points
- **Higher is better**

### 3. **Area Efficiency Score (Tie-breaker #2)**

- **Description**: How well player preserves block area throughout the game
- **Calculation**: (Total Tower Area / Total Possible Area) × 1000
- **Range**: 0-1000 points
- **Perfect area retention**: 1000 points
- **Higher is better**

### 4. **Total Tower Area (Tie-breaker #3)**

- **Description**: Sum of areas of all successfully placed blocks
- **Measured in square units**
- **Shows overall space preservation skill**
- **Higher is better**

### 5. **Perfect Placements (Tie-breaker #4)**

- **Description**: Count of blocks that snapped perfectly to center
- **Range**: 0 to total level count
- **Perfect placement occurs when overlap difference < 0.3 units**
- **Higher is better**

### 6. **Final Block Area (Tie-breaker #5)**

- **Description**: Area of the last successfully placed block
- **Shows endgame precision under pressure**
- **Higher is better**

### 7. **Area Consistency (Tie-breaker #6)**

- **Description**: How consistent block areas are throughout the game
- **Calculation**: 100 × (1 - coefficient_of_variation)
- **Range**: 0-100 points
- **Higher consistency shows better control**
- **Higher is better**

### 8. **Average Precision (Tie-breaker #7)**

- **Description**: Average overlap percentage across all successful placements
- **Range**: 0% to 100%
- **Shows consistency of accurate placements**
- **Higher is better**

### 9. **Total Game Time (Tie-breaker #8)**

- **Description**: Time from game start to game over
- **Measured in milliseconds**
- **For same level, faster completion shows better skill**
- **Lower is better**

### 10. **Average Reaction Time (Tie-breaker #9)**

- **Description**: Average time between block spawn and placement click
- **Measured in milliseconds**
- **Shows decision-making speed**
- **Lower is better**

### 11. **Max Consecutive Streak (Tie-breaker #10)**

- **Description**: Longest sequence of successful block placements
- **Range**: 0 to total level count
- **Shows sustained performance under pressure**
- **Higher is better**

## Additional Area-Based Metrics (Tracked but not in ranking)

### **Area Retention Rate**

- **Description**: Percentage of total possible area retained
- **Formula**: (Total Tower Area / Total Possible Area) × 100%
- **Shows overall area preservation efficiency**

### **Total Area Lost**

- **Description**: Sum of all area lost from trimming and misses
- **Measured in square units**
- **Lower indicates better precision**

### **Average Area Loss**

- **Description**: Average area lost per block placement attempt
- **Shows consistency of area preservation**

### **Minimum Block Area**

- **Description**: Smallest successfully placed block area
- **Shows skill under maximum difficulty**

### **Efficiency (Overall)**

- **Description**: Percentage of attempted blocks that were successfully placed
- **Formula**: (Successful placements / Total attempts) × 100%
- **Shows overall skill level**

## Implementation Details

### Data Storage

- Metrics are automatically saved to browser's localStorage
- Key: `towerBlockCompetitionScore`
- Format: JSON object with all metrics

### Accessing Competition Data

```javascript
// Get player's latest score
var score = getCompetitionScore();

// Rank multiple players
var rankedPlayers = rankPlayers([player1Score, player2Score, player3Score]);
```

### Console Output

After each game, detailed metrics are logged to console:

```
=== COMPETITION METRICS ===
Final Level: 15
Total Precision Score: 12450
Average Precision: 83.2%
Perfect Placements: 3
Game Duration: 45.3s
Average Reaction Time: 1250ms
Max Consecutive Streak: 8
Efficiency: 93.8%
--- AREA METRICS ---
Total Tower Area: 785
Area Retention Rate: 78.5%
Total Area Lost: 215
Average Area Loss: 14.3
Minimum Block Area: 12
Final Block Area: 45
Area Consistency: 67.8
Area Efficiency Score: 785
========================
```

## Example Ranking Scenarios

### Scenario 1: Same Level, Different Area Efficiency

- **Player A**: Level 10, Precision Score 8500, Area Efficiency 850
- **Player B**: Level 10, Precision Score 8500, Area Efficiency 720
- **Winner**: Player A (better area preservation)

### Scenario 2: Same Level & Precision, Different Final Block

- **Player A**: Level 15, Precision 9000, Area 800, Final Block 25
- **Player B**: Level 15, Precision 9000, Area 800, Final Block 35
- **Winner**: Player B (larger final block shows better endgame control)

### Scenario 3: Area Consistency Tie-Breaker

- **Player A**: Level 12, All metrics same, Area Consistency 75.2
- **Player B**: Level 12, All metrics same, Area Consistency 68.9
- **Winner**: Player A (more consistent area preservation)

- **Player A**: Level 12, Precision 8000, Perfect 2, Time 50s
- **Player B**: Level 12, Precision 8000, Perfect 3, Time 55s
- **Winner**: Player B (more perfect placements)

## Competition Best Practices

### For Players:

1. **Aim for accuracy over speed** - Precision score is the primary tie-breaker
2. **Try for perfect placements** - They provide maximum points and reset block size
3. **Stay consistent** - Consecutive streaks matter for tie-breaking
4. **Practice timing** - Faster reaction times help in close competitions

### For Organizers:

1. **Use the console output** for detailed score verification
2. **Implement server-side validation** if running online competitions
3. **Consider multiple rounds** and take best score or average
4. **Document the ranking system** clearly for participants

## Technical Integration

### Server-Side Competition System

```javascript
// Example Node.js ranking endpoint
app.post("/submit-score", (req, res) => {
  const playerScore = req.body;

  // Validate score metrics
  if (!validateScore(playerScore)) {
    return res.status(400).json({ error: "Invalid score data" });
  }

  // Add to database
  savePlayerScore(playerScore);

  // Get updated leaderboard
  const leaderboard = rankPlayers(getAllScores());

  res.json({
    rank: leaderboard.findIndex((p) => p.playerId === playerScore.playerId) + 1,
    leaderboard: leaderboard.slice(0, 10), // Top 10
  });
});
```

### Database Schema Suggestion

```sql
CREATE TABLE competition_scores (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(255) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    total_precision_score INTEGER NOT NULL,
    average_precision DECIMAL(5,2) NOT NULL,
    perfect_placements INTEGER NOT NULL,
    total_game_time INTEGER NOT NULL,
    average_reaction_time INTEGER NOT NULL,
    max_consecutive_streak INTEGER NOT NULL,
    efficiency DECIMAL(5,2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Anti-Cheat Considerations

1. **Server-side validation** of metric ranges and relationships
2. **Time-based anomaly detection** (impossibly fast reactions)
3. **Precision validation** (ensure math adds up correctly)
4. **Multiple submission handling** (take best score, prevent spam)
5. **Browser fingerprinting** to prevent multiple accounts

This comprehensive system ensures fair competition ranking even when multiple players achieve the same level!
