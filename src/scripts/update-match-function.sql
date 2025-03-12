-- Update the match_torah_texts function to handle multiple filters properly
create or replace function match_torah_texts (
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  filter jsonb
)
returns table (
  id uuid,
  ref text,
  book text,
  section text,
  content text,
  language text,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  -- Log the filter for debugging
  raise notice 'Running match_torah_texts with filter: %', filter;

  if filter is null or filter = '{}'::jsonb then
    return query
      select
        id,
        ref,
        book,
        section,
        content,
        language,
        1 - (embedding <=> query_embedding) as similarity
      from torah_texts
      where embedding is not null
      order by embedding <=> query_embedding
      limit match_count;
  else
    -- Handle language filter
    if filter ? 'language' then
      -- If we have both language and ref filters
      if filter ? 'ref' and filter -> 'ref' ? 'in' then
        raise notice 'Using combined language and ref filter';
        return query
          select
            id,
            ref,
            book,
            section,
            content,
            language,
            1 - (embedding <=> query_embedding) as similarity
          from torah_texts
          where 
            embedding is not null and
            language = filter ->> 'language' and
            ref = ANY (ARRAY(SELECT jsonb_array_elements_text(filter -> 'ref' -> 'in')))
          order by embedding <=> query_embedding
          limit match_count;
      -- Only language filter
      else
        raise notice 'Using language-only filter';
        return query
          select
            id,
            ref,
            book,
            section,
            content,
            language,
            1 - (embedding <=> query_embedding) as similarity
          from torah_texts
          where 
            embedding is not null and
            language = filter ->> 'language'
          order by embedding <=> query_embedding
          limit match_count;
      end if;
    -- Only ref filter without language
    elsif filter ? 'ref' and filter -> 'ref' ? 'in' then
      raise notice 'Using ref-only filter';
      return query
        select
          id,
          ref,
          book,
          section,
          content,
          language,
          1 - (embedding <=> query_embedding) as similarity
        from torah_texts
        where 
          embedding is not null and
          ref = ANY (ARRAY(SELECT jsonb_array_elements_text(filter -> 'ref' -> 'in')))
        order by embedding <=> query_embedding
        limit match_count;
    -- Default case with no special handling
    else
      raise notice 'Using default filter handling';
      return query
        select
          id,
          ref,
          book,
          section,
          content,
          language,
          1 - (embedding <=> query_embedding) as similarity
        from torah_texts
        where embedding is not null
        order by embedding <=> query_embedding
        limit match_count;
    end if;
  end if;
end;
$$; 