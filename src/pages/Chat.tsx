import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase';
import { ref, onValue, push, set, serverTimestamp, query, limitToLast, remove } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Send, Smile, MoreHorizontal, Trash2, 
  Check, CheckCheck, Clock, User as UserIcon 
} from 'lucide-react';
import { format } from 'date-fns';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string[]>; // emoji -> [userIds]
}

const Chat = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isDarkMode } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(location.state?.otherUser || null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messageMenu, setMessageMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) return;

    // Fetch other user info if not available
    if (!otherUser) {
      const otherUserId = chatId.replace(user?.uid || '', '').replace('_', '');
      onValue(ref(db, `users/${otherUserId}`), (snapshot) => {
        setOtherUser(snapshot.val());
      });
    }

    // Fetch messages
    const messagesRef = query(ref(db, `messages/${chatId}`), limitToLast(50));
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }));
        setMessages(messageList);
        
        // Mark as read if last message is from other user
        const lastMsg = messageList[messageList.length - 1];
        if (lastMsg && lastMsg.senderId !== user?.uid && lastMsg.status !== 'read') {
          set(ref(db, `messages/${chatId}/${lastMsg.id}/status`), 'read');
        }
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [chatId, user, otherUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !chatId) return;

    const newMessageRef = push(ref(db, `messages/${chatId}`));
    const messageData = {
      senderId: user?.uid,
      text: inputText,
      timestamp: Date.now(),
      status: 'sent'
    };

    await set(newMessageRef, messageData);
    
    // Update last message in users list
    await set(ref(db, `users/${user?.uid}/lastMessage`), inputText);
    await set(ref(db, `users/${user?.uid}/lastMessageTime`), Date.now());
    
    setInputText('');
    setShowEmojiPicker(false);
  };

  const deleteMessage = async (msgId: string) => {
    if (!chatId) return;
    await remove(ref(db, `messages/${chatId}/${msgId}`));
    setMessageMenu(null);
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!chatId || !user) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const reactions = msg.reactions || {};
    const userIds = reactions[emoji] || [];
    const newUserIds = userIds.includes(user.uid)
      ? userIds.filter(id => id !== user.uid)
      : [...userIds, user.uid];

    if (newUserIds.length === 0) {
      await remove(ref(db, `messages/${chatId}/${msgId}/reactions/${emoji}`));
    } else {
      await set(ref(db, `messages/${chatId}/${msgId}/reactions/${emoji}`), newUserIds);
    }
    setMessageMenu(null);
  };

  const onEmojiClick = (emojiData: any) => {
    setInputText(prev => prev + emojiData.emoji);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header */}
      <header className="glass px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={otherUser?.photoURL || undefined} 
                alt={otherUser?.displayName} 
                className="w-10 h-10 rounded-xl object-cover shadow-md"
              />
              {otherUser?.online && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
              )}
            </div>
            <div>
              <h2 className="font-semibold leading-tight">{otherUser?.displayName}</h2>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {otherUser?.online ? 'Active Now' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        <button className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          <MoreHorizontal className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
            <MessageSquareIcon className="w-12 h-12 mb-2" />
            <p className="text-sm">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.uid;
            const showDate = index === 0 || 
              format(messages[index-1].timestamp, 'yyyy-MM-dd') !== format(msg.timestamp, 'yyyy-MM-dd');

            return (
              <React.Fragment key={msg.id}>
                {showDate && msg.timestamp && (
                  <div className="flex justify-center my-6">
                    <span className="px-3 py-1 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {format(msg.timestamp, 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
                <div className={cn(
                  "flex flex-col group",
                  isMe ? "items-end" : "items-start"
                )}>
                  <div className="flex items-end gap-2 max-w-[85%]">
                    {!isMe && (
                      <img 
                        src={otherUser?.photoURL || undefined} 
                        className="w-6 h-6 rounded-lg mb-1 hidden sm:block" 
                        alt="" 
                      />
                    )}
                    <div className="relative">
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm shadow-sm relative animate-bubble",
                          isMe 
                            ? "bg-gradient-to-br from-primary-start to-primary-end text-white rounded-tr-none" 
                            : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-800"
                        )}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setMessageMenu(msg.id);
                        }}
                      >
                        {msg.text}
                      </motion.div>

                      {/* Reactions Display */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={cn(
                          "absolute -bottom-3 flex flex-wrap gap-1 z-10",
                          isMe ? "right-0" : "left-0"
                        )}>
                          {Object.entries(msg.reactions as Record<string, string[]>).map(([emoji, userIds]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] glass shadow-sm hover:scale-110 transition-transform",
                                userIds.includes(user?.uid || '') ? "border-primary-start/50 bg-primary-start/10" : ""
                              )}
                            >
                              <span>{emoji}</span>
                              <span className="font-bold">{userIds.length}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <AnimatePresence>
                        {messageMenu === msg.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setMessageMenu(null)} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className={cn(
                                "absolute z-30 top-full mt-1 w-48 glass rounded-xl p-2 shadow-xl",
                                isMe ? "right-0" : "left-0"
                              )}
                            >
                              <div className="flex items-center justify-around mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                                {['❤️', '👍', '😂', '😮', '😢', '🔥'].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => toggleReaction(msg.id, emoji)}
                                    className="text-lg hover:scale-125 transition-transform p-1"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              <button 
                                onClick={() => deleteMessage(msg.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "flex items-center gap-1.5 mt-1 px-1",
                    isMe ? "flex-row-reverse" : "flex-row"
                  )}>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {msg.timestamp ? format(msg.timestamp, 'HH:mm') : ''}
                    </span>
                    {isMe && (
                      <span className="text-slate-400">
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3 h-3 text-primary-start" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={scrollRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 glass relative">
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full right-4 mb-4 z-20"
            >
              <EmojiPicker 
                onEmojiClick={onEmojiClick}
                theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                width={300}
                height={400}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
          <button 
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={cn(
              "p-3 rounded-2xl transition-colors",
              showEmojiPicker ? "bg-primary-start text-white" : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
            )}
          >
            <Smile className="w-6 h-6" />
          </button>
          
          <input 
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="input-field flex-1"
          />
          
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="btn-primary p-3 rounded-2xl flex items-center justify-center min-w-[52px]"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </footer>
    </div>
  );
};

const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default Chat;
