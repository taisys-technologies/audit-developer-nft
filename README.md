# audit-developer-nft

The contract is based from ERC721, but in order to saving gas fee, we choose to inherit ERC721A.\
Basically, contract is close to original ERC721, but we did some changes to fit requirements,\
the following are some explanation for the function or user scenario.

## Contract Scenario Description
- Period Procedure\
  We want to divide total NFT supply into many rounds of sale, and each round is called as `Period`.\
  We don't record all numbers of supplement for each period in contract, but only the number of current period supply (`_periodTokenSupply`) and the sum of numbers of supplement from the first period to the current period (`_availableTokenSupply`). In this way, we may save some contract storage.\
  While starting next period (function`setPeriodTokenSupply`), admin needs to set up the number of next period maximum NFT supply.\
  Also, if admin wants to start next period, he needs to make sure the NFT supply of previous period are sold out. Otherwise, he can not start next period.\
  Last but not least, `_availableTokenSupply` should not be greater than total NFT supply (`_maxTokenSupply`).
</br>

- Buying NFT Procedure\
  Only buyers on whitelisting can buy NFT, the detailed method is listed the below function `checkTokenAndMint`.\
  The following will explain about the connection of `_availableTokenSupply` and selling NFT.
  If the buyer is able to mint NFT, the contract will make sure the `_currentIndex` plus one which is the id of the NFT to be minted is samller than `_availableTokenSupply`.\
  If the above situation is invalid, it means the number of minted NFT is equal to `_availableTokenSupply`.\
  The buyer needs to wait the admin starting the next period. Otherwise, he cannot mint NFT.\
  If the situation is valid and the buyer has never minted NFT in this contract, he would be able to mint NFT with token(ERC20).
</br>

## Function Description
- checkTokenAndMint\
  Only address on whitelisting can mint NFT, and this part we implement through EIP712.\
  Every address need to call checkTokenAndMint function with arguments: uuid, userAddress, deadline, uri, and signature.
  The signature will be signed by the address assigned by the contract admin, and that's `ERC721AStorageCustom.layout()._signerAddress`.\
  In addition, we use uuid but not nonce,\
  because if there are two addresses try to request token for mint NFT at the same time,\
  one of the address must fail because they got the same nonce,\
  and the failed executor may be confused about why would the signature be wrong.\
  The signature is provided by `_signerAddress` and should be accurate.\
  In order to optimize user experience, we choose to use uuid though it may cost much more contract storage.
</br>

- setPrice **onlyAdmin**\
  To set up price for all NFTs which are still for sale.
</br>

- setSignerAddress **onlyAdmin**\
  Admin can change the signerAddress who can sign the signature for the raiser who is able to mint NFT.
</br>

- setMaxTokenSupply **onlyAdmin**\
  Offering this function for admin to modify the total NFT supply limit, but only before the NFT haven't start to be sold.
</br>

- setPeriodTokenSupply **onlyAdmin**\
  Only while the current period is sold out, admin can set up the number of next period,\
  and at the same time, the next period will be new current period,\
  that is to say this function is the way to switch to new period.
  `_availableTokenSupply` will add the number of new current period as new maximum supplement,\
  and new `_availableTokenSupply` must not be greater than `_maxTokenSupply`.
</br>

- withdraw **onlyAdmin**\
  When user mint address, the contract will get token.\
  The admin can withdraw the token back or transfer to whoever he want.
</br>

- transferAdmin **onlyAdmin**\
  We add this function to achieve grant Admin and transfer at the same time.