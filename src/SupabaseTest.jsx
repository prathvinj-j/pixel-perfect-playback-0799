
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';

function SupabaseTest() {

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {

        async function fetchUsers() {

            const { data, error } = await supabase
                .from('users')
                .select('*');

            if (error) {
                setError(error.message);
            } else {
                setUsers(data);
            }

            setLoading(false);
        }

        fetchUsers();

    }, []);

    return (
        <div>
            <h1>Supabase Connection</h1>

            {loading && <p>Connecting...</p>}

            {error && <p>Error: {error}</p>}

            {!loading && !error && (
                <div>
                    <h3>Connected Successfully!</h3>

                    {users.map(user => (
                        <div key={user.id}>
                            <p>{user.name}</p>
                            <p>{user.email}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SupabaseTest;
