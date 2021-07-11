import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { useSelector, useDispatch } from 'react-redux';
import { selectDarkMode } from 'containers/ThemeProvider/selectors';
import { useInjectReducer } from 'utils/injectReducer';
import { IFrameEthereumProvider } from '@ledgerhq/iframe-provider';
import { initOnboard, initNotify } from './services';
import { connectionConnected, accountUpdated } from './actions';
import ConnectionContext from './context';
import reducer from './reducer';
// function for ledgerhq library which checkes if website is inside an iframe, if so it picksup the ledger provider to the dapp loads in the ledger app
function isIframe() {
  try {
    console.log('is I Frame?', window.self !== window.top);
    return window.self !== window.top;
  } catch (e) {
    console.log(e);
  }
  return false;
}

export default function ConnectionProvider(props) {
  let newWeb3;
  let signer;
  if (isIframe()){
    newWeb3 = Web3.(new IFrameEthereumProvider());
    console.log('web3provider', newWeb3);
    console.log('accounts', newWeb3.eth.accounts.wallet);
    window.ethereum = newWeb3.eth.accounts.wallet;
    console.log('window.ethereum', window.ethereum);
  }
  useInjectReducer({ key: 'connection', reducer });
  const { children } = props;
  const darkMode = useSelector(selectDarkMode());
  const dispatch = useDispatch();
  const [account, setAccount] = useState(null);
  const [wallet, setWallet] = useState({});
  const [onboard, setOnboard] = useState(null);
  const [notify, setNotify] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [network, setNetwork] = useState(null);

  const dispatchConnectionConnected = () => {
    dispatch(connectionConnected(account));
  };

  const initializeWallet = () => {
    const selectWallet = async (newWallet) => {
      if (newWallet.provider) {
        if (isIframe()){
          await window.ethereum.enable
          newWeb3.eth.net.isListening().then(dispatchConnectionConnected);
          setWallet(newWeb3.eth.accounts.wallet);
          console.log('current provider name', newWeb3.provider !== 'Proxy');
        } else {
          newWeb3 = new Web3(newWallet.provider);
          newWeb3.eth.net.isListening().then(dispatchConnectionConnected);
          console.log('current provider name', newWeb3.currentProvider);
          setWallet(newWallet);
        }
        console.log('new Wallet', newWallet);
        setWeb3(newWeb3);
        window.localStorage.setItem('selectedWallet', newWallet.name);
      } else {
        setWallet({});
      }
    };
    const onboardConfig = {
      address: setAccount,
      wallet: selectWallet,
      network: setNetwork,
    };
    const newOnboard = initOnboard(onboardConfig, darkMode);
    setNotify(initNotify(darkMode));
    setOnboard(newOnboard);
  };

  const accountChanged = () => {
    if (account) {
      dispatch(accountUpdated(account, web3));
    }
  };

  const reconnectWallet = () => {
    const previouslySelectedWallet = window.localStorage.getItem(
      'selectedWallet',
    );
    if (previouslySelectedWallet && onboard) {
      onboard.walletSelect(previouslySelectedWallet);
    }
  };

  const changeDarkMode = () => {
    if (onboard) {
      onboard.config({ darkMode });
    }
  };

  const networkChanged = () => {
    if (onboard && network) {
      onboard.walletCheck();
    }
  };

  useEffect(initializeWallet, []);
  useEffect(reconnectWallet, [onboard]);
  useEffect(accountChanged, [account]);
  useEffect(changeDarkMode, [darkMode]);
  useEffect(networkChanged, [network]);

  const selectWallet = async () => {
    // Open wallet modal
    const selectedWallet = await onboard.walletSelect();

    // User quit modal
    if (!selectedWallet) {
      return;
    }

    // Wait for wallet selection initialization
    const readyToTransact = await onboard.walletCheck();
    if (readyToTransact) {
      // Fetch active wallet and connect
      const currentState = onboard.getState();
      const activeWallet = currentState.wallet;
      activeWallet.connect(onboard);
    }
  };

  return (
    <ConnectionContext.Provider
      value={{ onboard, wallet, account, selectWallet, web3, notify }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}
