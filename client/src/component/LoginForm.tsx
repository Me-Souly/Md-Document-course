import React, { FC, useContext, useState } from 'react';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';

const LoginForm: FC = () => {
    const [identifier, setIdentifier] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const {store} = useContext(Context);

    return (
        <div>
            <input 
                onChange={e => setEmail(e.target.value)}
                value={email}
                type="text" 
                placeholder='Email'
            />
            <input 
                onChange={e => setUsername(e.target.value)}
                value={username}
                type="text" 
                placeholder='Username'
            />
            <input 
                onChange={e => setPassword(e.target.value)}
                value={password}
                type="password" 
                placeholder='Password'
            />
            <input 
                onChange={e => setIdentifier(e.target.value)}
                value={identifier}
                type="text" 
                placeholder='Username/Mail'
            />
            <button onClick={() => store.login(identifier, password)}>
                Login
            </button>
            <button onClick={() => store.registration(email, username, password)}>
                Register
            </button>
        </div>
    );
};

export default observer(LoginForm);