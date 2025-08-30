import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (socketRef.current) {
                return;
            }

            try {
                const newSocket = await initSocket();
                socketRef.current = newSocket;

                newSocket.on('connect_error', (err) => handleErrors(err));
                newSocket.on('connect_failed', (err) => handleErrors(err));

                function handleErrors(e) {
                    console.log('socket error', e);
                    toast.error('Socket connection failed, try again later.');
                    reactNavigator('/');
                }

                newSocket.emit(ACTIONS.JOIN, {
                    roomId,
                    username: location.state?.username,
                });

                newSocket.on(
                    ACTIONS.JOINED,
                    ({ clients, username, socketId }) => {
                        if (username !== location.state?.username) {
                            toast.success(`${username} joined the room.`);
                            console.log(`${username} joined`);
                        }
                        setClients(clients);
                        newSocket.emit(ACTIONS.SYNC_CODE, {
                            code: codeRef.current,
                            socketId,
                        });
                    }
                );

                newSocket.on(
                    ACTIONS.DISCONNECTED,
                    ({ socketId, username }) => {
                        toast.success(`${username} left the room.`);
                        setClients((prev) => {
                            return prev.filter(
                                (client) => client.socketId !== socketId
                            );
                        });
                    }
                );

                setIsInitialized(true);
            } catch (error) {
                console.error("Initialization error:", error);
                toast.error("An error occurred during socket initialization.");
                reactNavigator('/');
            }
        };

        init();
        
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current = null;
            }
        };
    }, [location.state?.username, reactNavigator, roomId]);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/code-sync.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                {isInitialized && ( // Conditionally render the Editor
                    <Editor
                        socketRef={socketRef}
                        roomId={roomId}
                        onCodeChange={(code) => {
                            codeRef.current = code;
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default EditorPage;
