# Submission

## Short Description

### Design Choices

1.  **Tech Stack Selection**: I chose to work with the provided **Bun + Elysia + Drizzle** stack for the backend due to its high performance and native TypeScript support. For the frontend, I used **React with TanStack Router** to ensure type-safe navigation and a seamless SPA experience
2.  **Modular API Architecture**: I separated the business logic into dedicated handlers and middleware. This makes the codebase easier to maintain and allows for the reuse of logic between the web frontend and the programmatic API
3.  **Real-time UX**: To meet the requirement for real-time updates without page refreshes, I implemented a polling/syncing mechanism that updates market odds and total pools dynamically as soon as new bets are placed
4.  **Database Integrity**: Using **Drizzle ORM with SQLite**, I designed a schema that enforces data consistency, especially for the relationship between users, markets, and bets, ensuring that balances are never updated incorrectly during payout distribution

### Challenges Faced

1.  **Dynamic Odds Calculation**: One of the biggest challenges was implementing the logic to calculate and update odds in real-time. I had to ensure that the odds displayed to the user were always reflective of the current "pool" size for each outcome to prevent arbitrage or balance errors
2.  **Proportional Payout Logic**: Developing the algorithm for distributing the total bet pool among winners was complex. I had to ensure that winners received a share exactly proportional to their stake while handling rounding issues in the virtual currency
3.  **Admin Workflow Integration**: Designing a secure yet intuitive way for administrators to resolve markets and trigger the payout distribution required careful thought regarding authentication and state management (moving a market from 'active' to 'resolved')
4.  **Learning a New Runtime**: Adapting to **Bun** and **Elysia** was an interesting learning curve. While similar to Node.js/Express, the specific ways Elysia handles type validation (via TypeBox) required me to rethink how I structure request schemas



## Images or Video Demo
