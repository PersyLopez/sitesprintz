# Prisma Migrations Workflow

## Overview

This project uses Prisma as the ORM and Prisma Migrate for database schema management. All database changes should go through Prisma migrations.

## Initial Setup (Already Done)

The project has been initialized with Prisma and the existing database schema has been imported.

```bash
# Generate Prisma Client (run after pulling schema changes)
npm run prisma:generate

# Or with npx
npx prisma generate
```

## Development Workflow

### 1. Making Schema Changes

Edit `prisma/schema.prisma` to add/modify models:

```prisma
model new_table {
  id         Int      @id @default(autoincrement())
  name       String   @db.VarChar(255)
  created_at DateTime @default(now()) @db.Timestamp(6)
}
```

### 2. Create a Migration

```bash
# Create and apply migration in development
npx prisma migrate dev --name descriptive_migration_name

# Example:
npx prisma migrate dev --name add_user_preferences
```

This command will:
- Generate SQL migration file
- Apply it to your development database
- Regenerate Prisma Client

### 3. Review the Migration

Check `prisma/migrations/[timestamp]_[name]/migration.sql` to verify the SQL is correct.

### 4. Commit the Migration

```bash
git add prisma/migrations
git add prisma/schema.prisma
git commit -m "Add: user preferences table"
```

## Production Deployment

### Option 1: Automatic Migration (Recommended for small teams)

```bash
# In your deployment script or CI/CD
npx prisma migrate deploy
```

### Option 2: Manual Review (Recommended for production)

```bash
# 1. Generate SQL without applying
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-database postgresql://your_production_db \
  --script > migration.sql

# 2. Review migration.sql

# 3. Apply manually
psql your_production_db < migration.sql

# 4. Mark as applied
npx prisma migrate resolve --applied [migration_name]
```

## Common Commands

### Generate Prisma Client
```bash
npx prisma generate
```

### View Current Database Schema
```bash
npx prisma db pull
```

### Format Schema File
```bash
npx prisma format
```

### Open Prisma Studio (Database GUI)
```bash
npx prisma studio
```

### Reset Development Database (⚠️ Destructive)
```bash
npx prisma migrate reset
```

### Check Migration Status
```bash
npx prisma migrate status
```

## Troubleshooting

### "Schema is out of sync"

```bash
# Pull latest schema from database
npx prisma db pull

# Then create migration for the changes
npx prisma migrate dev --name sync_schema
```

### "Migration failed to apply"

```bash
# Check what failed
npx prisma migrate status

# Mark as resolved if you fixed it manually
npx prisma migrate resolve --applied [migration_name]

# Or roll back (if in development)
npx prisma migrate reset
```

### "Prisma Client is out of date"

```bash
# Regenerate client
npx prisma generate
```

## Best Practices

1. **Never edit migrations manually** - Always use `prisma migrate dev`
2. **Test migrations** - Run them in a staging environment first
3. **Backup before migrating** - Always backup production before applying migrations
4. **Small migrations** - Keep migrations small and focused
5. **Descriptive names** - Use clear migration names: `add_user_email_index`, not `update_users`
6. **Review SQL** - Always review the generated SQL before applying to production
7. **One-way migrations** - Don't try to undo migrations, create new ones instead

## Migration States

- **Pending**: Migration exists but hasn't been applied
- **Applied**: Migration has been successfully applied
- **Failed**: Migration failed to apply
- **Rolled back**: Migration was undone (development only)

## Schema Change Examples

### Adding a Column

```prisma
model users {
  id         Int      @id @default(autoincrement())
  email      String   @unique
  // Add this
  phone      String?  @db.VarChar(50)
}
```

```bash
npx prisma migrate dev --name add_user_phone
```

### Adding an Index

```prisma
model users {
  id         Int      @id @default(autoincrement())
  email      String   @unique
  created_at DateTime @default(now())
  
  @@index([created_at])  // Add this
}
```

```bash
npx prisma migrate dev --name add_users_created_at_index
```

### Adding a Relation

```prisma
model users {
  id      Int      @id @default(autoincrement())
  posts   posts[]  // Add this
}

model posts {
  id        Int   @id @default(autoincrement())
  user_id   Int
  users     users @relation(fields: [user_id], references: [id])
}
```

```bash
npx prisma migrate dev --name add_user_posts_relation
```

## Environment Variables

Required in `.env`:

```env
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
```

## Package.json Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:studio": "prisma studio",
    "prisma:format": "prisma format"
  }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Support

- **Prisma Docs**: https://www.prisma.io/docs
- **Prisma Migrate**: https://www.prisma.io/docs/concepts/components/prisma-migrate
- **Prisma Client**: https://www.prisma.io/docs/concepts/components/prisma-client

---

**Status**: ✅ Migrations workflow configured and ready to use
**Last Updated**: November 15, 2025

