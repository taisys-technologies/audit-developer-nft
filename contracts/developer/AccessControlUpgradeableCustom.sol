// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract AccessControlUpgradeableCustom is
    Initializable,
    AccessControlUpgradeable
{
    using AddressUpgradeable for address;

    /**
     * Global Variables
     */
    mapping(address => address) private _inTransition;

    /**
     * Events
     */

    event TransferAdmin(address adminAddress);
    event UpdateAdmin(address oldAdminAddress);
    event CancelTransferAdmin(address newAdminAddress);

    /**
     * Errors
     */

    error ErrIntransition();
    error ErrNotIntransition();
    error ErrInvalidTransition();
    error ErrGrantRoleInValidAddress();

    /**
     * modifier
     */

    // check if transition do exist
    modifier inTransition(address oldAdmin) {
        if (_inTransition[oldAdmin] == address(0)) {
            revert ErrNotIntransition();
        }
        _;
    }

    // check there's no transition pending
    modifier notInTransition() {
        if (_inTransition[_msgSender()] != address(0)) {
            revert ErrIntransition();
        }
        _;
    }

    /**
     * Functions
     */

    function __AccessControlCustom_init() internal onlyInitializing {
        __AccessControl_init();
    }

    /// return pending transition is to whom
    ///
    /// @param admin address - the original Admin
    ///
    /// @return newAdmin address - whom the Admin role is transfered to
    function transition(address admin) external view returns (address) {
        return _inTransition[admin];
    }

    /// grant admin to newAdmin, and set a pending transition in record
    ///
    /// @param newAdmin address - the address that Admin role is transfered to
    function transferAdmin(address newAdmin)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        notInTransition
    {
        if (newAdmin == address(0) || newAdmin == _msgSender()) {
            revert ErrGrantRoleInValidAddress();
        }
        _inTransition[_msgSender()] = newAdmin;
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        emit TransferAdmin(newAdmin);
    }

    /// the address who gets admin from transition are able to accept and revoke the old Admin
    ///
    /// @param oldAdmin address - the original Admin address
    function updateAdmin(address oldAdmin)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        inTransition(oldAdmin)
    {
        if (_inTransition[oldAdmin] != _msgSender()) {
            revert ErrInvalidTransition();
        }
        _inTransition[oldAdmin] = address(0);
        _revokeRole(DEFAULT_ADMIN_ROLE, oldAdmin);
        emit UpdateAdmin(oldAdmin);
    }

    /// old Admin can cancel its transition
    function cancelTransferAdmin()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        inTransition(_msgSender())
    {
        address adminToBeCanceled = _inTransition[_msgSender()];
        _inTransition[_msgSender()] = address(0);
        _revokeRole(DEFAULT_ADMIN_ROLE, adminToBeCanceled);
        emit CancelTransferAdmin(adminToBeCanceled);
    }
}
