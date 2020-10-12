/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import ButtonWithPanel from '../../shared/ButtonWithPanel';
import ArrowPanel from '../../shared/ArrowPanel';
import { MetaOverheadStatistics } from './MetaOverheadStatistics';
import { formatBytes } from '../../../utils/format-numbers';

import type { Profile, ProfileMeta } from '../../../types/profile';
import type { SymbolicationStatus } from '../../../types/state';
import { typeof resymbolicateProfile } from '../../../actions/receive-profile';
import { assertExhaustiveCheck } from '../../../utils/flow';

import './MetaInfo.css';

type Props = {
  profile: Profile,
  symbolicationStatus: SymbolicationStatus,
  resymbolicateProfile: resymbolicateProfile,
};

/**
 * This component formats the profile's meta information into a dropdown panel.
 */
export class MenuButtonsMetaInfo extends React.PureComponent<Props> {
  /**
   * This method provides information about the symbolication status, and a button
   * to re-trigger symbolication.
   */
  renderSymbolication() {
    const { profile, symbolicationStatus, resymbolicateProfile } = this.props;
    const isSymbolicated = profile.meta.symbolicated;

    switch (symbolicationStatus) {
      case 'DONE':
        return (
          <>
            <div className="metaInfoRow">
              <span className="metaInfoLabel">Symbols:</span>
              {isSymbolicated
                ? 'Profile is symbolicated'
                : 'Profile is not symbolicated'}
            </div>
            <div className="metaInfoRow">
              <span className="metaInfoLabel"></span>
              <button
                onClick={resymbolicateProfile}
                type="button"
                className="photon-button photon-button-micro"
              >
                {isSymbolicated
                  ? 'Re-symbolicate profile'
                  : 'Symbolicate profile'}
              </button>
            </div>
          </>
        );
      case 'SYMBOLICATING':
        return (
          <div className="metaInfoRow">
            <span className="metaInfoLabel">Symbols:</span>
            {isSymbolicated
              ? 'Attempting to re-symbolicate profile'
              : 'Currently symbolicating profile'}
          </div>
        );
      default:
        throw assertExhaustiveCheck(
          symbolicationStatus,
          'Unhandled SymbolicationStatus.'
        );
    }
  }

  render() {
    const { meta, profilerOverhead } = this.props.profile;
    const { configuration } = meta;

    return (
      <ButtonWithPanel
        className="menuButtonsMetaInfoButton"
        buttonClassName="menuButtonsMetaInfoButtonButton"
        label={_formatLabel(meta) || 'Profile information'}
        panel={
          <ArrowPanel className="arrowPanelOpenMetaInfo">
            <h2 className="arrowPanelSubTitle">Profile Information</h2>
            <div className="arrowPanelSection">
              {meta.startTime ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">Recording started:</span>
                  {_formatDate(meta.startTime)}
                </div>
              ) : null}
              {meta.interval ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">Interval:</span>
                  {meta.interval}ms
                </div>
              ) : null}
              {meta.preprocessedProfileVersion ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">Profile Version:</span>
                  {meta.preprocessedProfileVersion}
                </div>
              ) : null}
              {configuration ? (
                <>
                  <div className="metaInfoRow">
                    <span className="metaInfoLabel">Buffer Capacity:</span>
                    {formatBytes(configuration.capacity)}
                  </div>
                  <div className="metaInfoRow">
                    <span className="metaInfoLabel">Buffer Duration:</span>
                    {configuration.duration
                      ? `${configuration.duration} seconds`
                      : 'Unlimited'}
                  </div>
                  <div className="arrowPanelSection">
                    <div className="metaInfoRow">
                      <span className="metaInfoLabel">Features:</span>
                      <ul className="metaInfoList">
                        {_mapInfoListItem(configuration.features)}
                      </ul>
                    </div>
                    <div className="metaInfoRow">
                      <span className="metaInfoLabel">Threads Filter:</span>
                      <ul className="metaInfoList">
                        {_mapInfoListItem(configuration.threads)}
                      </ul>
                    </div>
                  </div>
                </>
              ) : null}
              {this.renderSymbolication()}
            </div>
            <h2 className="arrowPanelSubTitle">Application</h2>
            <div className="arrowPanelSection">
              {meta.product ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">Name:</span>
                  {meta.product}
                </div>
              ) : null}
              {meta.misc ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">Version:</span>
                  {_formatVersionNumber(meta.misc)}
                </div>
              ) : null}
              {meta.updateChannel ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">Update Channel:</span>
                  {meta.updateChannel}
                </div>
              ) : null}
              {meta.appBuildID ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">Build ID:</span>
                  {meta.sourceURL ? (
                    <a
                      href={meta.sourceURL}
                      title={meta.sourceURL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {meta.appBuildID}
                    </a>
                  ) : (
                    meta.appBuildID
                  )}
                </div>
              ) : null}
              {meta.debug !== undefined ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">Build Type:</span>
                  {meta.debug ? 'Debug' : 'Opt'}
                </div>
              ) : null}
              {meta.extensions ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">Extensions:</span>
                  <ul className="metaInfoList">
                    {_mapInfoListItem(meta.extensions.name)}
                  </ul>
                </div>
              ) : null}
            </div>
            <h2 className="arrowPanelSubTitle">Platform</h2>
            <div className="arrowPanelSection">
              {meta.platform ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">Platform:</span>
                  {meta.platform}
                </div>
              ) : null}
              {meta.oscpu ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">OS:</span>
                  {meta.oscpu}
                </div>
              ) : null}
              {meta.abi ? (
                <div className="metaInfoRow">
                  <span className="metaInfoLabel">ABI:</span>
                  {meta.abi}
                </div>
              ) : null}
            </div>
            {meta.visualMetrics ? (
              <>
                <h2 className="arrowPanelSubTitle">Visual Metrics</h2>
                <div className="arrowPanelSection">
                  <div className="metaInfoRow">
                    <span className="visualMetricsLabel">Speed Index:</span>
                    {meta.visualMetrics.SpeedIndex}
                  </div>
                  <div className="metaInfoRow">
                    <span className="visualMetricsLabel">
                      Perceptual Speed Index:
                    </span>
                    {meta.visualMetrics.PerceptualSpeedIndex}
                  </div>
                  <div className="metaInfoRow">
                    <span className="visualMetricsLabel">
                      Contentful Speed Index:
                    </span>
                    {meta.visualMetrics.ContentfulSpeedIndex}
                  </div>
                </div>
              </>
            ) : null}
            {/*
              Older profiles(before FF 70) don't have any overhead info.
              Don't show anything if that's the case.
            */}
            {profilerOverhead ? (
              <MetaOverheadStatistics profilerOverhead={profilerOverhead} />
            ) : null}
          </ArrowPanel>
        }
      />
    );
  }
}

function _mapInfoListItem(data: string[]): React.DOM {
  return data.map(d => (
    <li className="metaInfoListItem" key={d}>
      {d}
    </li>
  ));
}

function _formatDate(timestamp: number): string {
  const timestampDate = new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    year: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
  });
  return timestampDate;
}

function _formatVersionNumber(version?: string): string | null {
  const regex = /[0-9]+.+[0-9]/gi;

  if (version) {
    const match = version.match(regex);
    if (match) {
      return match.toString();
    }
  }
  return null;
}

function _formatLabel(meta: ProfileMeta): string {
  const product = meta.product || '';
  const version = _formatVersionNumber(meta.misc) || '';
  let os;
  // To displaying Android Version instead of Linux for Android developers.
  if (meta.platform !== undefined && meta.platform.match(/android/i)) {
    os = meta.platform;
  } else {
    os = meta.oscpu || '';
  }
  return product + (version ? ` (${version})` : '') + (os ? ` ${os}` : '');
}
