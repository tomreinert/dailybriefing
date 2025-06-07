'use client';

import { useEffect, useState, useCallback } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Loader2, Trash2 } from 'lucide-react';

interface Snippet {
  id: string;
  content: string;
  active: boolean;
}

export default function ContextSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSnippet, setNewSnippet] = useState('');
  // Track local input values to prevent API interference while typing
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  // Track debounce timeouts for each snippet
  const [debounceTimeouts, setDebounceTimeouts] = useState<Record<string, NodeJS.Timeout>>({});
  // Track auth provider for dummy data button
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [seedingDummyData, setSeedingDummyData] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetchSnippets();
    fetchAuthProvider();
  }, []);

  const fetchAuthProvider = async () => {
    try {
      const res = await fetch('/api/auth/provider');
      if (res.ok) {
        const data = await res.json();
        setAuthProvider(data.provider);
      }
    } catch (error) {
      console.error('Failed to fetch auth provider:', error);
    }
  };

  const fetchSnippets = async () => {
    setLoading(true);
    const res = await fetch('/api/context');
    const data = await res.json();
    setSnippets(data);
    // Initialize local values with current snippet content
    const initialLocalValues: Record<string, string> = {};
    data.forEach((snippet: Snippet) => {
      initialLocalValues[snippet.id] = snippet.content;
    });
    setLocalValues(initialLocalValues);
    setLoading(false);
  };

  const addSnippet = async () => {
    if (!newSnippet.trim()) return;
    
    // Check if we've reached the maximum number of snippets
    if (snippets.length >= 20) {
      alert('Maximum of 20 snippets allowed for this demo.');
      return;
    }
    
    const res = await fetch('/api/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newSnippet }),
    });
    if (res.ok) {
      const newItem = await res.json();
      setSnippets(prev => [...prev, newItem]);
      // Initialize local value for new snippet
      setLocalValues(prev => ({ ...prev, [newItem.id]: newItem.content }));
      setNewSnippet('');
    }
  };

  const updateSnippet = async (id: string, content: string, active: boolean) => {
    const res = await fetch('/api/context', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content, active }),
    });
    if (res.ok) {
      const updatedItem = await res.json();
      setSnippets(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ));
    }
  };

  const handleContentChange = (id: string, newContent: string) => {
    // Update local state immediately for responsive UI
    setLocalValues(prev => ({ ...prev, [id]: newContent }));
    
    // Clear existing timeout for this snippet
    if (debounceTimeouts[id]) {
      clearTimeout(debounceTimeouts[id]);
    }
    
    // Set new timeout for debounced API update
    const snippet = snippets.find(s => s.id === id);
    if (snippet) {
      const timeoutId = setTimeout(() => {
        // Only update if content actually changed from the server state
        if (snippet.content !== newContent) {
          updateSnippet(id, newContent, snippet.active);
        }
        // Clean up timeout
        setDebounceTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[id];
          return newTimeouts;
        });
      }, 500);
      
      setDebounceTimeouts(prev => ({ ...prev, [id]: timeoutId }));
    }
  };

  const handleActiveToggle = (id: string, checked: boolean) => {
    const snippet = snippets.find(s => s.id === id);
    if (snippet) {
      // Use the local value if it exists, otherwise use the snippet content
      const currentContent = localValues[id] || snippet.content;
      updateSnippet(id, currentContent, checked);
    }
  };

  const deleteSnippet = async (id: string) => {
    // Clear any pending timeout for this snippet
    if (debounceTimeouts[id]) {
      clearTimeout(debounceTimeouts[id]);
    }
    
    const res = await fetch('/api/context', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setSnippets(prev => prev.filter(item => item.id !== id));
      // Clean up local value and timeout
      setLocalValues(prev => {
        const newValues = { ...prev };
        delete newValues[id];
        return newValues;
      });
      setDebounceTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[id];
        return newTimeouts;
      });
    }
  };

  const seedDummyData = async () => {
    setSeedingDummyData(true);
    try {
      const res = await fetch('/api/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        console.log('Demo context snippets seeded successfully');
        // Refresh snippets to show the new data
        await fetchSnippets();
      } else {
        const error = await res.json();
        console.error('Failed to seed dummy data:', error);
      }
    } catch (error) {
      console.error('Failed to seed dummy data:', error);
    } finally {
      setSeedingDummyData(false);
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [debounceTimeouts]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Input
          value={newSnippet}
          onChange={e => setNewSnippet(e.target.value)}
          placeholder="Add a new snippet (e.g. To-Do, note, talking point)"
          className="flex-1"
          maxLength={200}
          onKeyDown={e => { if (e.key === 'Enter') addSnippet(); }}
        />
        <Button onClick={addSnippet} disabled={!newSnippet.trim() || snippets.length >= 20}>
          Add
        </Button>
      </div>
      
      {snippets.length >= 20 && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
          Maximum of 20 snippets reached for this demo.
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : snippets.length === 0 ? (
        <>
          {authProvider === 'github' && (
            <div className="flex flex-col gap-2">
              <Button 
                onClick={seedDummyData}
                disabled={seedingDummyData}
                variant="default"
                size="sm"
                className="w-fit"
              >
                {seedingDummyData ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Loading demo data...
                  </>
                ) : (
                  'Get demo context'
                )}
              </Button>
            </div>
          )}
        <div className="rounded-lg border bg-muted/40 p-5 text-sm text-muted-foreground flex flex-col items-start gap-3">
          <div className="font-medium text-base text-foreground mb-1">Add some context</div>
          <div>
            Add a few notes to help your AI assistant understand your world. Anything he needs to know which isn't apparent from your calendar or emails. Here are some examples:
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>I usually work Monday to Thursday.</li>
            <li>I pickup the kids from school on Friday at 4pm.</li>
            <li>Adults: Sarah, John</li>
            <li>Kids: Emma, Jake</li>
          </ul>
          <div className="mt-2 flex flex-col gap-3">
            <span>Add your first snippet above!</span>
          </div>
        </div>
        </>
      ) : (
        <ul className="">
          {snippets.map(snippet => (
            <li key={snippet.id} className="flex items-center gap-2 rounded p-2">
              <Checkbox
                checked={snippet.active}
                onCheckedChange={checked => handleActiveToggle(snippet.id, !!checked)}
                className="mr-2"
              />
              <Input
                value={localValues[snippet.id] || snippet.content}
                onChange={e => handleContentChange(snippet.id, e.target.value)}
                className={`flex-1 ${!snippet.active ? 'line-through text-muted-foreground' : ''}`}
                maxLength={200}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteSnippet(snippet.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 