// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Ledger} from "./Ledger.sol";

/// @title JudgeLog
/// @notice Commit-before-result log for non-deterministic judges (for example a Jev model).
///
/// A judge states, for a candidate it has not yet seen scored, P(dev score > threshold) in basis points.
/// The log refuses a prediction once the Ledger already holds that candidate's result, so a judge cannot
/// "predict" what is already on chain. Calibration (Brier score, reliability) is computed from this log and
/// the Ledger by anyone; authority is earned from that, never granted (principle 8, see docs/jev.md).
contract JudgeLog {
    error AlreadyScored();
    error AlreadyPredicted();
    error BadProbability();

    Ledger public immutable ledger;

    // [0..15] pBps, [16..47] threshold int32 bits, [48..127] block number, bit 255 set flag
    mapping(bytes32 key => mapping(address judge => uint256)) private _pred;

    event Predicted(bytes32 indexed key, address indexed judge, int32 threshold, uint16 pBps);

    constructor(Ledger ledger_) {
        ledger = ledger_;
    }

    function predict(bytes32 key, int32 threshold, uint16 pBps) external {
        if (pBps > 10_000) revert BadProbability();
        if (ledger.exists(key)) revert AlreadyScored();
        if (_pred[key][msg.sender] != 0) revert AlreadyPredicted();
        _pred[key][msg.sender] =
            (1 << 255) | uint256(pBps) | (uint256(uint32(threshold)) << 16) | (uint256(block.number) << 48);
        emit Predicted(key, msg.sender, threshold, pBps);
    }

    function get(bytes32 key, address judge)
        external
        view
        returns (int32 threshold, uint16 pBps, uint80 atBlock, bool found)
    {
        uint256 w = _pred[key][judge];
        found = w != 0;
        pBps = uint16(w);
        threshold = int32(uint32(w >> 16));
        atBlock = uint80(w >> 48);
    }

    /// @notice Resolve one prediction against the Ledger. `resolved` is false until the candidate is scored.
    /// @dev `outcome` is true if the candidate's dev score exceeded the threshold the judge was asked about.
    function resolve(bytes32 key, address judge) external view returns (bool resolved, bool outcome, uint16 pBps) {
        uint256 w = _pred[key][judge];
        if (w == 0) return (false, false, 0);
        (, int32 dev, , , , bool found) = ledger.getDev(key);
        if (!found) return (false, false, uint16(w));
        return (true, dev > int32(uint32(w >> 16)), uint16(w));
    }
}
