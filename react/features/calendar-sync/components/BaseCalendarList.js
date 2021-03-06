// @flow

import React, { Component } from 'react';
import { connect } from 'react-redux';

import { appNavigate } from '../../app';
import {
    createCalendarClickedEvent,
    createCalendarSelectedEvent,
    sendAnalytics
} from '../../analytics';
import { getLocalizedDateFormatter, translate } from '../../base/i18n';
import { NavigateSectionList } from '../../base/react';

import { refreshCalendar } from '../actions';

import { isCalendarEnabled } from '../functions';

import AddMeetingUrlButton from './AddMeetingUrlButton';
import JoinButton from './JoinButton';

/**
 * The type of the React {@code Component} props of
 * {@link BaseCalendarList}.
 */
type Props = {

    /**
     * The calendar event list.
     */
    _eventList: Array<Object>,

    /**
     * Indicates if the list is disabled or not.
     */
    disabled: boolean,

    /**
     * The Redux dispatch function.
     */
    dispatch: Function,

    /**
     *
     */
    renderListEmptyComponent: Function,

    /**
     * The translate function.
     */
    t: Function
};

/**
 * Component to display a list of events from a connected calendar.
 */
class BaseCalendarList extends Component<Props> {
    /**
     * Default values for the component's props.
     */
    static defaultProps = {
        _eventList: []
    };

    /**
     * Public API method for {@code Component}s rendered in
     * {@link AbstractPagedList}. When invoked, refreshes the calendar entries
     * in the app.
     *
     * Note: It is a static method as the {@code Component} may not be
     * initialized yet when the UI invokes refresh (e.g. {@link TabBarIOS} tab
     * change).
     *
     * @param {Function} dispatch - The Redux dispatch function.
     * @param {boolean} isInteractive - If true this refresh was caused by
     * direct user interaction, false otherwise.
     * @public
     * @returns {void}
     */
    static refresh(dispatch, isInteractive) {
        dispatch(refreshCalendar(false, isInteractive));
    }

    /**
     * Initializes a new {@code BaseCalendarList} instance.
     *
     * @inheritdoc
     */
    constructor(props) {
        super(props);

        // Bind event handlers so they are only bound once per instance.
        this._onJoinPress = this._onJoinPress.bind(this);
        this._onPress = this._onPress.bind(this);
        this._onRefresh = this._onRefresh.bind(this);
        this._toDateString = this._toDateString.bind(this);
        this._toDisplayableItem = this._toDisplayableItem.bind(this);
        this._toDisplayableList = this._toDisplayableList.bind(this);
        this._toTimeString = this._toTimeString.bind(this);
    }

    /**
     * Implements React's {@link Component#componentDidMount()}. Invoked
     * immediately after this component is mounted.
     *
     * @inheritdoc
     * @returns {void}
     */
    componentDidMount() {
        sendAnalytics(createCalendarSelectedEvent());
    }

    /**
     * Implements React's {@link Component#render}.
     *
     * @inheritdoc
     */
    render() {
        const { disabled, renderListEmptyComponent } = this.props;

        return (
            <NavigateSectionList
                disabled = { disabled }
                onPress = { this._onPress }
                onRefresh = { this._onRefresh }
                renderListEmptyComponent
                    = { renderListEmptyComponent }
                sections = { this._toDisplayableList() } />
        );
    }

    _onJoinPress: (Object, string) => Function;

    /**
     * Handles the list's navigate action.
     *
     * @private
     * @param {Object} event - The click event.
     * @param {string} url - The url string to navigate to.
     * @returns {void}
     */
    _onJoinPress(event, url) {
        event.stopPropagation();

        this._onPress(url, 'calendar.meeting.join');
    }

    _onPress: (string, string) => Function;

    /**
     * Handles the list's navigate action.
     *
     * @private
     * @param {string} url - The url string to navigate to.
     * @param {string} analyticsEventName - Тhe name of the analytics event.
     * associated with this action.
     * @returns {void}
     */
    _onPress(url, analyticsEventName = 'calendar.meeting.tile') {
        sendAnalytics(createCalendarClickedEvent(analyticsEventName));

        this.props.dispatch(appNavigate(url));
    }

    _onRefresh: () => void;

    /**
     * Callback to execute when the list is doing a pull-to-refresh.
     *
     * @private
     * @returns {void}
     */
    _onRefresh() {
        this.props.dispatch(refreshCalendar(true));
    }

    _toDateString: Object => string;

    /**
     * Generates a date string for a given event.
     *
     * @param {Object} event - The event.
     * @private
     * @returns {string}
     */
    _toDateString(event) {
        const startDateTime
            = getLocalizedDateFormatter(event.startDate).format('MMM Do, YYYY');

        return `${startDateTime}`;
    }

    _toDisplayableItem: Object => Object;

    /**
     * Creates a displayable object from an event.
     *
     * @param {Object} event - The calendar event.
     * @private
     * @returns {Object}
     */
    _toDisplayableItem(event) {
        return {
            elementAfter: event.url
                ? <JoinButton onPress = { this._onJoinPress } />
                : (<AddMeetingUrlButton
                    calendarId = { event.calendarId }
                    eventId = { event.id } />),
            key: `${event.id}-${event.startDate}`,
            lines: [
                event.url,
                this._toTimeString(event)
            ],
            title: event.title,
            url: event.url
        };
    }

    _toDisplayableList: () => Array<Object>;

    /**
     * Transforms the event list to a displayable list with sections.
     *
     * @private
     * @returns {Array<Object>}
     */
    _toDisplayableList() {
        const { _eventList, t } = this.props;

        const now = new Date();

        const { createSection } = NavigateSectionList;
        const TODAY_SECTION = 'today';
        const sectionMap = new Map();

        for (const event of _eventList) {
            const displayableEvent = this._toDisplayableItem(event);
            const startDate = new Date(event.startDate).getDate();

            if (startDate === now.getDate()) {
                let todaySection = sectionMap.get(TODAY_SECTION);

                if (!todaySection) {
                    todaySection
                        = createSection(t('calendarSync.today'), TODAY_SECTION);
                    sectionMap.set(TODAY_SECTION, todaySection);
                }

                todaySection.data.push(displayableEvent);
            } else if (sectionMap.has(startDate)) {
                const section = sectionMap.get(startDate);

                if (section) {
                    section.data.push(displayableEvent);
                }
            } else {
                const newSection
                    = createSection(this._toDateString(event), startDate);

                sectionMap.set(startDate, newSection);
                newSection.data.push(displayableEvent);
            }
        }

        return Array.from(sectionMap.values());
    }

    _toTimeString: Object => string;

    /**
     * Generates a time (interval) string for a given event.
     *
     * @param {Object} event - The event.
     * @private
     * @returns {string}
     */
    _toTimeString(event) {
        const startDateTime
            = getLocalizedDateFormatter(event.startDate).format('lll');
        const endTime
            = getLocalizedDateFormatter(event.endDate).format('LT');

        return `${startDateTime} - ${endTime}`;
    }
}

/**
 * Maps redux state to component props.
 *
 * @param {Object} state - The redux state.
 * @returns {{
 *     _eventList: Array<Object>
 * }}
 */
function _mapStateToProps(state: Object) {
    return {
        _eventList: state['features/calendar-sync'].events
    };
}

export default isCalendarEnabled()
    ? translate(connect(_mapStateToProps)(BaseCalendarList))
    : undefined;
