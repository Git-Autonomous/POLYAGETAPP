
import React, { useState, useEffect } from 'react';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';

interface CodeBlockProps {
    code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code }) => {
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => {
                setIsCopied(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setIsCopied(true);
        });
    };

    return (
        <div className="relative group">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-gray-700 rounded-md text-gray-400 hover:text-white hover:bg-gray-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Copy code"
            >
                {isCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
            </button>
            <pre className="bg-gray-950/70 p-4 rounded-md overflow-x-auto text-sm text-gray-300 language-typescript">
                <code>{code}</code>
            </pre>
        </div>
    );
};

export default CodeBlock;
