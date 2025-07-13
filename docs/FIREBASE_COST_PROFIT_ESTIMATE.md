# Firebase Cost & Profit Estimate for Voyager PWA

This document provides cost and profit estimates for different user levels, with activity limits and premium conversion rates, to help guide business decisions.

---

## Assumptions
- **Free users:** 10 or 20 itinerary views/searches per day
- **Premium users:** 50 views/searches per day (unlimited, but using a realistic average)
- **Premium conversion rate:** 2%
- **Premium price:** $9.99/month
- **Firestore pricing:**
  - Reads: $0.06 per 100,000
  - Writes: $0.18 per 100,000
- **User distribution:** 98% free, 2% premium

---

## 1. Firebase Cost Table (10 Itineraries/Searches per Day)

| Users      | Free Users | Premium Users | Total Reads | Total Writes | Reads Cost | Writes Cost | Total Cost |
|------------|------------|--------------|------------|-------------|------------|-------------|------------|
| 10,000     | 9,800      | 200          | 2,994,000  | 299,400     | $1.80      | $0.54       | $2.34      |
| 100,000    | 98,000     | 2,000        | 29,940,000 | 2,994,000   | $17.96     | $5.39       | $23.35     |
| 500,000    | 490,000    | 10,000       | 149,700,000| 14,970,000  | $89.82     | $26.95      | $116.77    |
| 1,000,000  | 980,000    | 20,000       | 299,400,000| 29,940,000  | $179.64    | $53.89      | $233.53    |
| 10,000,000 | 9,800,000  | 200,000      | 2,994,000,000| 299,400,000| $1,796.40  | $538.92     | $2,335.32  |

---

## 2. Firebase Cost Table (20 Itineraries/Searches per Day)

| Users      | Free Users | Premium Users | Total Reads | Total Writes | Reads Cost | Writes Cost | Total Cost |
|------------|------------|--------------|------------|-------------|------------|-------------|------------|
| 10,000     | 9,800      | 200          | 5,988,000  | 598,800     | $3.59      | $1.08       | $4.67      |
| 100,000    | 98,000     | 2,000        | 59,880,000 | 5,988,000   | $35.93     | $10.78      | $46.71     |
| 500,000    | 490,000    | 10,000       | 299,400,000| 29,940,000  | $179.64    | $53.89      | $233.53    |
| 1,000,000  | 980,000    | 20,000       | 598,800,000| 59,880,000  | $359.28    | $107.78     | $467.06    |
| 10,000,000 | 9,800,000  | 200,000      | 5,988,000,000| 598,800,000| $3,592.80  | $1,077.84   | $4,670.64  |

---

## 3. Profit Table (10 Itineraries/Searches per Day)

| Users      | Premium Users | Revenue      | Firebase Cost | Profit      |
|------------|---------------|--------------|--------------|-------------|
| 10,000     | 200           | $1,998       | $2.34        | $1,995.66   |
| 100,000    | 2,000         | $19,980      | $23.35       | $19,956.65  |
| 500,000    | 10,000        | $99,900      | $116.77      | $99,783.23  |
| 1,000,000  | 20,000        | $199,800     | $233.53      | $199,566.47 |
| 10,000,000 | 200,000       | $1,998,000   | $2,335.32    | $1,995,664.68|

---

## 4. Profit Table (20 Itineraries/Searches per Day)

| Users      | Premium Users | Revenue      | Firebase Cost | Profit      |
|------------|---------------|--------------|--------------|-------------|
| 10,000     | 200           | $1,998       | $4.67        | $1,993.33   |
| 100,000    | 2,000         | $19,980      | $46.71       | $19,933.29  |
| 500,000    | 10,000        | $99,900      | $233.53      | $99,666.47  |
| 1,000,000  | 20,000        | $199,800     | $467.06      | $199,332.94 |
| 10,000,000 | 200,000       | $1,998,000   | $4,670.64    | $1,993,329.36|

---

## 5. Decision Table: 10 vs 20 Itineraries/Searches per Day

| Users      | 10/day Cost | 20/day Cost | Cost Difference | Revenue (2% premium) | Profit Difference |
|------------|-------------|-------------|-----------------|----------------------|------------------|
| 10,000     | $2.34       | $4.67       | $2.33           | $1,998               | $-2.33           |
| 100,000    | $23.35      | $46.71      | $23.36          | $19,980              | $-23.36          |
| 500,000    | $116.77     | $233.53     | $116.76         | $99,900              | $-116.76         |
| 1,000,000  | $233.53     | $467.06     | $233.53         | $199,800             | $-233.53         |
| 10,000,000 | $2,335.32   | $4,670.64   | $2,335.32       | $1,998,000           | $-2,335.32       |

---


## 6. Impact of Premium Conversion Rate on Profit

The tables above assume a fixed 2% premium conversion rate for both 10 and 20 free searches per day. In reality, limiting free users to 10 searches may encourage more upgrades, increasing the premium conversion rate (e.g., to 3%).

Below is a comparison of profit at 2% (20/day) vs 3% (10/day) conversion rates:

| Users      | Premium % | Premium Users | Revenue      | Firebase Cost | Profit      |
|------------|-----------|--------------|--------------|--------------|-------------|
| 10,000     | 2%        | 200          | $1,998       | $4.67        | $1,993.33   |
| 10,000     | 3%        | 300          | $2,997       | $2.34        | $2,994.66   |
| 100,000    | 2%        | 2,000        | $19,980      | $46.71       | $19,933.29  |
| 100,000    | 3%        | 3,000        | $29,970      | $23.35       | $29,946.65  |
| 500,000    | 2%        | 10,000       | $99,900      | $233.53      | $99,666.47  |
| 500,000    | 3%        | 15,000       | $149,850     | $116.77      | $149,733.23 |
| 1,000,000  | 2%        | 20,000       | $199,800     | $467.06      | $199,332.94 |
| 1,000,000  | 3%        | 30,000       | $299,700     | $233.53      | $299,466.47 |
| 10,000,000 | 2%        | 200,000      | $1,998,000   | $4,670.64    | $1,993,329.36|
| 10,000,000 | 3%        | 300,000      | $2,997,000   | $2,335.32    | $2,994,664.68|

**Key Takeaway:**
- If lowering the free limit from 20 to 10 searches increases the premium conversion rate from 2% to 3%, profit increases dramatically—even though Firebase costs decrease only slightly. The main profit driver is premium upgrades, not backend cost.

---

## 7. Summary & Recommendation
- Firebase costs are negligible compared to revenue, even at high scale.
- The free user limit should be set based on what maximizes premium conversion and user satisfaction.
- Lowering the free limit can increase profit if it raises the premium conversion rate, but may also impact user retention or satisfaction.
- Consider A/B testing different free limits to find the optimal balance for your audience.

---

**Prepared for Voyager PWA Beta Release**

---

**Prepared for Voyager PWA Beta Release**
