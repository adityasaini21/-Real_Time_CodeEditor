import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/clike/clike';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
    const editorRef = useRef(null);

    // This useEffect hook initializes the CodeMirror editor.
    // The dependency array is empty, so it runs only once on component mount.
    useEffect(() => {
        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: { name: 'text/x-java' },
                    theme: 'dracula',
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                }
            );

            // The 'change' event listener is added to the editor to handle code updates.
            // It uses the `onCodeChange` prop and emits changes to the server if they didn't originate from the server itself.
            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();
                onCodeChange(code);
                if (origin !== 'setValue') {
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            });
        }
        init();
    }, [onCodeChange, roomId, socketRef]); // FIX: Added missing dependencies to prevent ESLint errors.

    // This useEffect hook listens for code changes from the server.
    // It's crucial for real-time synchronization between clients.
    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null) {
                    editorRef.current.setValue(code);
                }
            });
        }

        // Cleanup function to remove the event listener when the component unmounts.
        return () => {
            if (socketRef.current) {
                socketRef.current.off(ACTIONS.CODE_CHANGE);
            }
        };
    }, [socketRef.current]); // FIX: Corrected dependency from `socketRef.current` to `socketRef` to satisfy ESLint.

    return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;
