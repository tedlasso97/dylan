import { useEffect, useRef, useState } from "react";
import { FiSend, FiTrendingUp, FiTarget, FiDollarSign } from "react-icons/fi";
import { BsChevronDown, BsPlusLg } from "react-icons/bs";
import { RxHamburgerMenu } from "react-icons/rx";
import useAnalytics from "@/hooks/useAnalytics";
import useAutoResizeTextArea from "@/hooks/useAutoResizeTextArea";
import Message from "./Message";
import { DEFAULT_OPENAI_MODEL } from "@/shared/Constants";
import { useMobileSidebar } from "./Layout";

const Chat = () => {
  const { toggleComponentVisibility } = useMobileSidebar();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showEmptyChat, setShowEmptyChat] = useState(true);
  const [conversation, setConversation] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const { trackEvent } = useAnalytics();
  const textAreaRef = useAutoResizeTextArea();
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  const selectedModel = DEFAULT_OPENAI_MODEL;

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "24px";
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [message, textAreaRef]);

  useEffect(() => {
    if (bottomOfChatRef.current) {
      bottomOfChatRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation]);

  const sendMessage = async (e: any) => {
    e.preventDefault();

    // Don't send empty messages
    if (message.length < 1) {
      setErrorMessage("Please enter a message.");
      return;
    } else {
      setErrorMessage("");
    }

    trackEvent("send.message", { message: message });
    setIsLoading(true);

    // Add the message to the conversation
    setConversation([
      ...conversation,
      { content: message, role: "user" },
      { content: null, role: "system" },
    ]);

    // Clear the message & remove empty chat
    setMessage("");
    setShowEmptyChat(false);

    try {
      const response = await fetch(`/api/openai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...conversation, { content: message, role: "user" }],
          model: selectedModel,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Add the message to the conversation
        setConversation([
          ...conversation,
          { content: message, role: "user" },
          { content: data.message, role: "system" },
        ]);
      } else {
        console.error(response);
        setErrorMessage(response.statusText);
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message);

      setIsLoading(false);
    }
  };

  const handleKeypress = (e: any) => {
    // It's triggers by pressing the enter key
    if (e.keyCode == 13 && !e.shiftKey) {
      sendMessage(e);
      e.preventDefault();
    }
  };

  return (
    <div className="flex max-w-full flex-1 flex-col bg-white">
      <div className="sticky top-0 z-10 flex items-center border-b border-gray-200 bg-white pl-1 pt-1 text-gray-900 sm:pl-3 md:hidden">
        <button
          type="button"
          className="-ml-0.5 -mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 focus:outline-none transition-colors duration-200"
          onClick={toggleComponentVisibility}
        >
          <span className="sr-only">Open sidebar</span>
          <RxHamburgerMenu className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-gray-900">Talk to Coach</h1>
        <button type="button" className="px-3 hover:bg-gray-100 rounded-lg transition-colors duration-200">
          <BsPlusLg className="h-5 w-5 text-gray-600" />
        </button>
      </div>
      <div className="relative h-full w-full transition-width flex flex-col overflow-hidden items-stretch flex-1">
        <div className="flex-1 overflow-hidden">
          <div className="react-scroll-to-bottom--css-ikyem-79elbk h-full bg-white">
            <div className="react-scroll-to-bottom--css-ikyem-1n7m0yu">
              {!showEmptyChat && conversation.length > 0 ? (
                        <div className="flex flex-col items-center text-sm bg-white">
                          <div className="flex w-full items-center justify-center gap-1 border-b border-gray-200 bg-gray-50 p-3 text-gray-500">
                            <span className="text-sm font-medium">Model: {selectedModel.name}</span>
                  </div>
                  {conversation.map((message, index) => (
                    <Message key={index} message={message} />
                  ))}
                  <div className="w-full h-32 md:h-48 flex-shrink-0"></div>
                  <div ref={bottomOfChatRef}></div>
                </div>
              ) : null}
              {showEmptyChat ? (
                        <div className="py-24 relative w-full flex flex-col h-full items-center justify-center">
                  {/* Simple Model Selector */}
                          <div className="mb-12">
                            <div className="relative w-48">
                              <button
                                className="relative flex w-full cursor-default flex-col rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-8 text-left focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 sm:text-sm hover:bg-gray-50 transition-all duration-200 shadow-sm"
                        id="headlessui-listbox-button-:r0:"
                        type="button"
                        aria-haspopup="true"
                        aria-expanded="false"
                        data-headlessui-state=""
                        aria-labelledby="headlessui-listbox-label-:r1: headlessui-listbox-button-:r0:"
                      >
                                <label
                                  className="block text-xs text-gray-500 text-center font-medium"
                                  id="headlessui-listbox-label-:r1:"
                                  data-headlessui-state=""
                                >
                                  Model
                                </label>
                        <span className="inline-flex w-full truncate">
                                  <span className="flex h-5 items-center gap-1 truncate text-gray-900 text-sm font-medium">
                            {selectedModel.name}
                          </span>
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                  <BsChevronDown className="h-3 w-3 text-gray-400" />
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Minimal Hero Section */}
                          <div className="text-center max-w-3xl mx-auto px-6">
                            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight mb-6">
                      Portfolio Manager
                    </h1>
                            <p className="text-xl text-gray-600 font-normal leading-relaxed mb-16">
                      Your intelligent crypto portfolio management assistant
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-col items-center text-sm dark:bg-gray-800"></div>
            </div>
          </div>
        </div>
                <div className="absolute bottom-0 left-0 w-full border-t border-gray-200 bg-white pt-6">
                  <form className="stretch mx-6 flex flex-row gap-4 last:mb-6 md:mx-8 md:last:mb-8 lg:mx-auto lg:max-w-3xl xl:max-w-4xl">
            <div className="relative flex flex-col h-full flex-1 items-stretch md:flex-col">
              {errorMessage ? (
                <div className="mb-4 md:mb-0">
                  <div className="h-full flex ml-1 md:w-full md:m-auto md:mb-4 gap-0 md:gap-2 justify-center">
                            <span className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg font-medium">{errorMessage}</span>
                  </div>
                </div>
              ) : null}
                      <div className="flex flex-col w-full py-4 flex-grow md:py-4 md:pl-4 relative border border-gray-200 bg-white text-gray-900 rounded-xl hover:border-gray-300 focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100 transition-all duration-200 shadow-sm">
                <textarea
                  ref={textAreaRef}
                  value={message}
                  tabIndex={0}
                  data-id="root"
                  style={{
                    height: "24px",
                    maxHeight: "200px",
                    overflowY: "hidden",
                  }}
                  placeholder="Ask me anything about your crypto portfolio..."
                          className="m-0 w-full resize-none border-0 bg-transparent p-0 pr-10 focus:ring-0 focus-visible:ring-0 pl-2 md:pl-0 text-gray-900 placeholder:text-gray-400 text-base leading-relaxed"
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeypress}
                ></textarea>
                <button
                  disabled={isLoading || message?.length === 0}
                  onClick={sendMessage}
                          className="absolute p-2 rounded-lg text-gray-400 hover:text-gray-600 bottom-2 right-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors duration-200"
                >
                  <FiSend className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
                  <div className="px-6 pt-3 pb-4 text-center text-sm text-gray-500 md:px-8 md:pt-4 md:pb-6">
                    <span className="font-medium">
                      Portfolio Manager may produce inaccurate information. Please verify all information before making investment decisions.
                    </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
