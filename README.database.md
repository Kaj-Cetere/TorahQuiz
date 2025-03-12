# Torah Quiz Database Design

## Tables and Structure

### Main Tables
- **torah_texts**: Master table containing all Talmudic texts (source of truth for content)
- **user_progress**: Tracks which texts a user has learned

### Key Relationships
- User selects content to learn → Entry added to `user_progress`
- Quiz generation → Filters `torah_texts` based on entries in `user_progress`

## Design Principles

We follow a normalized database design where:
1. Text content is stored only once in the master `torah_texts` table
2. User learning progress is tracked separately in `user_progress`
3. When generating quizzes, we query `torah_texts` filtered by the refs in `user_progress`

This approach has several advantages:
- Eliminates data duplication (no need to store the same text multiple times)
- Ensures consistent content (if a text is updated, all users see the update)
- Simplifies database maintenance
- Performs well with proper indexing

## Quiz Generation Logic

The application supports two modes for generating quizzes:

1. **Standard Mode**: Tests users on texts they've marked as learned
   ```
   SELECT t.* FROM torah_texts t
   JOIN user_progress up ON t.ref = up.ref
   WHERE up.user_id = [user_id]
   AND up.is_completed = true
   ```

2. **Exploration Mode**: Allows users to test themselves on any content
   ```
   SELECT t.* FROM torah_texts t
   WHERE t.book = [selected_tractate]
   ```

## Functions and Procedures

- **mark_daf_learned**: Marks a specific daf as learned for a user
  ```sql
  SELECT mark_daf_learned(user_id, ref, timestamp);
  ```

## Initialization Process

To set up the database properly:
1. Initialize the master table with texts using `/api/init-talmud?tractate=Tractate1,Tractate2`
2. Users mark specific dafim as learned through the learning interface
3. Entries are created in `user_progress`
4. Quizzes filter the master table based on these entries

## Implementation Details

The implementation uses Supabase's Row Level Security (RLS) to ensure users can only:
- See and modify their own progress data
- Access content appropriate to their permissions

For performance reasons, we use indexes on:
- `torah_texts.ref`
- `torah_texts.book`
- `user_progress.user_id`
- `user_progress.ref` 