# Feature Plan: Add real-time notifications

**Project:** sitesprintz  
**Created:** Thu Nov 20 17:55:09 EST 2025  
**Status:** Planning

---

# Feature: Add real-time notifications

## 🎯 Overview
This feature will add real-time notifications to the sitesprintz application. Notifications will be triggered by specific events such as new messages, updates, or alerts. The system will use WebSockets for real-time communication and will be integrated with the existing user authentication system.

## 🏗️ Architecture

### High-Level Design
The architecture will consist of the following components:
- **WebSocket Server**: Handles real-time communication between the client and server.
- **Notification Service**: Manages the creation and dispatch of notifications.
- **User Service**: Handles user authentication and retrieval of user information.
- **Event Service**: Triggers notifications based on specific events.

### Component Breakdown
- **WebSocket Server**: Manages WebSocket connections and handles incoming messages.
- **Notification Service**: Manages the creation and dispatch of notifications.
- **User Service**: Handles user authentication and retrieval of user information.
- **Event Service**: Triggers notifications based on specific events.

### Data Models
- **User**: Represents a user with fields such as `id`, `username`, and `email`.
- **Notification**: Represents a notification with fields such as `id`, `userId`, `message`, and `timestamp`.

## 📁 File Structure
```
sitesprintz/
├── app/
│   ├── api/
│   │   ├── websockets/
│   │   │   ├── index.ts
│   │   │   ├── handlers.ts
│   │   ├── notifications/
│   │   │   ├── index.ts
│   │   │   ├── service.ts
│   │   ├── users/
│   │   │   ├── index.ts
│   │   │   ├── service.ts
│   │   ├── events/
│   │   │   ├── index.ts
│   │   │   ├── service.ts
│   ├── components/
│   │   ├── Notification.tsx
│   │   ├── NotificationList.tsx
│   ├── lib/
│   │   ├── types/
│   │   │   ├── user.ts
│   │   │   ├── notification.ts
│   ├── hooks/
│   │   ├── useNotifications.ts
│   ├── actions/
│   │   ├── createNotification.ts
│   ├── schema/
│   │   ├── user.ts
│   │   ├── notification.ts
├── public/
├── styles/
├── .env.local
├── next.config.js
├── tsconfig.json
├── package.json
```

## 🔧 Tech Stack
- **Next.js 15+ (App Router only)**
- **React 19 + Server Components first, Server Actions, streaming, partial prerendering**
- **TypeScript 5.6+ (strict mode, no any, satisfy checks)**
- **Tailwind CSS v3.4+ only**
- **shadcn/ui + Radix primitives + Headless UI when needed**
- **lucide-react icons**
- **next-themes + tailwindcss-dark-mode**
- **framer-motion for animations**
- **Zod + React Hook Form for forms**
- **TanStack Query (React Query) for data fetching**
- **Zustand or Jotai for client state only when necessary**

## 📋 Implementation Steps

### Phase 1: Setup
- [ ] Step 1: Install necessary dependencies.
  ```bash
  npm install @next-auth/react @next-auth/jwt @prisma/client @tanstack/react-query @tanstack/react-query-devtools @types/node @types/react @types/react-dom @types/vite @types/jest @types/react-hook-form @types/zod
  ```
- [ ] Step 2: Set up Prisma for database operations.
  ```bash
  npx prisma init
  ```
  Update `prisma/schema.prisma` with the following schema:
  ```prisma
  datasource db {
    provider = "sqlite"
    url      = env("DATABASE_URL")
  }

  generator client {
    provider = "prisma-client-js"
  }

  model User {
    id    Int     @id @default(autoincrement())
    email String  @unique
    name  String?
  }

  model Notification {
    id        Int     @id @default(autoincrement())
    userId    Int
    message   String
    timestamp DateTime @default(now())
    user      User    @relation(fields: [userId], references: [id])
  }
  ```

### Phase 2: Core Features
- [ ] Step 1: Implement WebSocket Server.
  ```typescript
  // app/api/websockets/index.ts
  import { Server } from 'ws';
  import { PrismaClient } from '@prisma/client';

  const prisma = new PrismaClient();
  const wss = new Server({ port: 8080 });

  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      const data = JSON.parse(message);
      if (data.type === 'notification') {
        const { userId, message } = data;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          ws.send(JSON.stringify({ type: 'notification', message }));
        }
      }
    });
  });
  ```
- [ ] Step 2: Implement Notification Service.
  ```typescript
  // app/api/notifications/service.ts
  import { PrismaClient } from '@prisma/client';

  const prisma = new PrismaClient();

  export async function createNotification(userId: number, message: string) {
    return prisma.notification.create({
      data: {
        userId,
        message,
      },
    });
  }
  ```
- [ ] Step 3: Implement User Service.
  ```typescript
  // app/api/users/service.ts
  import { PrismaClient } from '@prisma/client';

  const prisma = new PrismaClient();

  export async function getUserById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  }
  ```
- [ ] Step 4: Implement Event Service.
  ```typescript
  // app/api/events/service.ts
  import { createNotification } from './notifications/service';

  export async function triggerNotification(userId: number, message: string) {
    await createNotification(userId, message);
  }
  ```

### Phase 3: Polish
- [ ] Step 1: Create Notification Component.
  ```typescript
  // app/components/Notification.tsx
  import { useEffect, useState } from 'react';
  import { useQuery } from '@tanstack/react-query';
  import { PrismaClient } from '@prisma/client';

  const prisma = new PrismaClient();

  const useNotifications = () => {
    return useQuery({
      queryKey: ['notifications'],
      queryFn: async () => {
        return prisma.notification.findMany();
      },
    });
  };

  const Notification = () => {
    const { data, isLoading, isError } = useNotifications();

    if (isLoading) return <div>Loading...</div>;
    if (isError) return <div>Error...</div>;

    return (
      <div>
        {data.map((notification) => (
          <div key={notification.id}>{notification.message}</div>
        ))}
      </div>
    );
  };

  export default Notification;
  ```
- [ ] Step 2: Integrate Notification Component into the App.
  ```typescript
  // app/page.tsx
  import Notification from '../components/Notification';

  const Home = () => {
    return (
      <div>
        <h1>Welcome to Sitesprintz</h1>
        <Notification />
      </div>
    );
  };

  export default Home;
  ```

## 🧪 Testing Strategy
- [ ] Step 1: Write unit tests for the Notification Service.
  ```typescript
  // app/api/notifications/service.test.ts
  import { createNotification } from './service';
  import { PrismaClient } from '@prisma/client';

  const prisma = new PrismaClient();

  jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
      notification: {
        create: jest.fn(),
      },
    })),
  }));

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const userId = 1;
      const message = 'Hello, world!';

      await createNotification(userId, message);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          message,
        },
      });
    });
  });
  ```
- [ ] Step 2: Write integration tests for the WebSocket Server.
  ```typescript
  // app/api/websockets/index.test.ts
  import { Server } from 'ws';
  import { createNotification } from '../notifications/service';

  const wss = new Server({ port: 8080 });

  describe('WebSocket Server', () => {
    it('should send a notification to the client', async () => {
      const userId = 1;
      const message = 'Hello, world!';

      await createNotification(userId, message);

      // Simulate client connection and message handling
      wss.on('connection', (ws) => {
        ws.on('message', (msg) => {
          const data = JSON.parse(msg);
          expect(data).toEqual({ type: 'notification', message });
        });
      });
    });
  });
  ```

## ⚠️ Considerations
- [ ] Edge cases: Handle cases where the user is offline or the WebSocket connection is lost.
- [ ] Security: Ensure that only authenticated users can receive notifications.
- [ ] Performance: Optimize the WebSocket server for high traffic.
- [ ] Scalability: Consider using a scalable WebSocket server like Redis or a dedicated WebSocket service.

## 📊 Acceptance Criteria
- [ ] Notifications are sent in real-time to authenticated users.
- [ ] Notifications are stored in the database.
- [ ] Notifications are displayed in the UI.
- [ ] Edge cases are handled gracefully.
- [ ] Security measures are in place.
- [ ] Performance is optimized.
- [ ] Scalability is considered.

---

## 📝 Notes

Add implementation notes here as you work.

## ✅ Progress

Track completion of implementation steps.
