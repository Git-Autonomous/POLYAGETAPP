
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

const Header: React.FC = () => {
    return (
        <header className="bg-gray-800/30 backdrop-blur-md border-b border-gray-700 sticky top-0 z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <SparklesIcon className="h-8 w-8 text-indigo-400" />
                        <h1 className="text-2xl font-bold text-white ml-3">
                            Polymarket CLOB CodeGen
                        </h1>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
