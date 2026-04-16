import { v4 as uuid } from "uuid";
import { LS_UUID } from "../shared/Constants";
import useLocalStorage from "./useLocalStorage";
import { useEffect, useState } from "react";

function useAppState() {
  const [isClient, setIsClient] = useState(false);
  const [userId, setUserId] = useLocalStorage(LS_UUID, "");

  useEffect(() => {
    setIsClient(true);
    // Only generate UUID if we don't have one and we're on client side
    if (!userId && typeof window !== "undefined") {
      setUserId(uuid());
    }
  }, [userId, setUserId]);

  return {
    userId: isClient ? userId : "",
    setUserId,
  };
}

export default useAppState;
