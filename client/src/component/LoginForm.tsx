import React, { FC, useContext, useState } from 'react';
import { Context } from '../index';
import { observer } from 'mobx-react-lite';

const LoginForm: FC = () => {
    const [identifier, setIdentifier] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const {store} = useContext(Context);

    return (
        <div>
            <input 
                onChange={e => setIdentifier(e.target.value)}
                value={identifier}
                type="text" 
                placeholder='Email'
            />
            <input 
                onChange={e => setPassword(e.target.value)}
                value={password}
                type="password" 
                placeholder='Password'
            />
            <button onClick={() => store.login(identifier, password)}>
                Login
            </button>
            <button onClick={() => store.registration(identifier, password)}>
                Register
            </button>
        </div>
    );
};

export default observer(LoginForm);