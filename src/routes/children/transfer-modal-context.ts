import { createContext, useContext } from 'react';

interface TransferModalCtx {
  openTransfer: () => void;
}

export const TransferModalContext = createContext<TransferModalCtx>({
  openTransfer: () => {},
});

export function useTransferModal() {
  return useContext(TransferModalContext);
}
