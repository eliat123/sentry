import React from 'react';
import underscore from 'underscore';
import {browserHistory} from 'react-router';

import ApiMixin from '../mixins/apiMixin';
import AutoSelectText from '../components/autoSelectText';
import DateTime from '../components/dateTime';
import IndicatorStore from '../stores/indicatorStore';
import LoadingError from '../components/loadingError';
import LoadingIndicator from '../components/loadingIndicator';
import OrganizationState from '../mixins/organizationState';
import {BooleanField, FormState, TextField} from '../components/forms';
import {t, tct} from '../locale';

const KeySettings = React.createClass({
  propTypes: {
    access: React.PropTypes.object.isRequired,
    orgId: React.PropTypes.string.isRequired,
    projectId: React.PropTypes.string.isRequired,
    data: React.PropTypes.object.isRequired,
    initialData: React.PropTypes.object,
    onRemove: React.PropTypes.func.isRequired,
    onSave: React.PropTypes.func.isRequired
  },

  mixins: [ApiMixin],

  getInitialState() {
    return {
      formData: Object.assign({}, this.props.initialData),
      errors: {}
    };
  },

  onFieldChange(name, value) {
    this.setState({
      formData: {
        ...this.state.formData,
        [name]: value
      }
    });
  },

  onSubmit(e) {
    e.preventDefault();

    if (this.state.state == FormState.SAVING) {
      return;
    }
    this.setState(
      {
        state: FormState.SAVING
      },
      () => {
        let loadingIndicator = IndicatorStore.add(t('Saving changes..'));
        let {orgId, projectId} = this.props;
        this.api.request(`/projects/${orgId}/${projectId}/`, {
          method: 'PUT',
          data: this.state.formData,
          success: data => {
            this.props.onSave(data);
            this.setState({
              state: FormState.READY,
              errors: {}
            });
          },
          error: error => {
            this.setState({
              state: FormState.ERROR,
              errors: error.responseJSON
            });
          },
          complete: () => {
            IndicatorStore.remove(loadingIndicator);
          }
        });
      }
    );
  },

  onRemove(e) {
    e.preventDefault();
    if (this.state.loading) return;

    /* eslint no-alert:0*/
    if (
      !window.confirm(
        'Are you sure you want to remove this key? This action is irreversible?'
      )
    )
      return;

    let loadingIndicator = IndicatorStore.add(t('Saving changes..'));
    let {orgId, projectId, data} = this.props;
    this.api.request(`/projects/${orgId}/${projectId}/keys/${data.id}/`, {
      method: 'DELETE',
      success: (d, _, jqXHR) => {
        this.props.onRemove();
        IndicatorStore.remove(loadingIndicator);
      },
      error: () => {
        this.setState({
          error: true,
          loading: false
        });
        IndicatorStore.remove(loadingIndicator);
      }
    });
  },

  render() {
    let isSaving = this.state.state === FormState.SAVING;
    let {errors, formData} = this.state;
    let hasChanges = !underscore.isEqual(this.props.initialData, formData);
    let {access, data} = this.props;

    return (
      <form onSubmit={this.onSubmit} className="form-stacked">
        {this.state.state === FormState.ERROR &&
          <div className="alert alert-error alert-block">
            {t(
              'Unable to save your changes. Please ensure all fields are valid and try again.'
            )}
          </div>}
        <div className="box">
          <div className="box-header">
            <h3>{t('Details')}</h3>
          </div>
          <div className="box-content with-padding">
            <TextField
              key="name"
              name="name"
              label={t('Name')}
              value={formData.name}
              required={false}
              error={errors.name}
              onChange={this.onFieldChange.bind(this, 'name')}
            />
            <BooleanField
              key="isActive"
              name="isActive"
              label={t('Enabled')}
              value={formData.isActive}
              required={false}
              error={errors.isActive}
              help={
                'Accept events from this key? This may be used to temporarily suspend a key.'
              }
              onChange={this.onFieldChange.bind(this, 'isActive')}
            />
            <div className="form-group">
              <label>{t('Created')}</label>
              <div className="controls">
                <DateTime date={data.dateCreated} />
              </div>
            </div>

            <fieldset className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving || !hasChanges}>
                {t('Save Changes')}
              </button>
            </fieldset>
          </div>
        </div>

        <div className="box dsn-credentials">
          <div className="box-header">
            <h3>{t('Credentials')}</h3>
          </div>
          <div className="box-content with-padding">
            <p>
              {t(
                'Your credentials are coupled to a public and secret key. Different clients will require different credentials, so make sure you check the documentation before plugging things in.'
              )}
            </p>
            <div className="form-group">
              <label>{t('DSN')}</label>
              <AutoSelectText className="form-control disabled">
                {data.dsn.secret}
              </AutoSelectText>
            </div>

            <div className="form-group">
              <label>{t('DSN (Public)')}</label>
              <AutoSelectText className="form-control disabled">
                {data.dsn.public}
              </AutoSelectText>
              <div className="help-block">
                {tct('Use your public DSN with browser-based SDKs such as [raven-js].', {
                  'raven-js': <a href="https://github.com/getsentry/raven-js">raven-js</a>
                })}
              </div>
            </div>
            <div className="form-group">
              <label>{t('CSP Endpoint')}</label>
              <AutoSelectText className="form-control disabled">
                {data.dsn.csp}
              </AutoSelectText>
              <div className="help-block">
                {tct(
                  'Use your CSP endpoint in the [directive] directive in your [header] header.',
                  {
                    directive: <code>report-uri</code>,
                    header: <code>Content-Security-Policy</code>
                  }
                )}
              </div>
            </div>
            <div className="form-group">
              <label>{t('Public Key')}</label>
              <div className="controls">
                <AutoSelectText className="form-control disabled">
                  {data.public}
                </AutoSelectText>
              </div>
            </div>
            <div className="form-group">
              <label>{t('Secret Key')}</label>
              <div className="controls">
                <AutoSelectText className="form-control disabled">
                  {data.secret}
                </AutoSelectText>
              </div>
            </div>
            <div className="form-group">
              <label>{t('Project ID')}</label>
              <div className="controls">
                <AutoSelectText className="form-control disabled">
                  {data.projectId}
                </AutoSelectText>
              </div>
            </div>
          </div>
        </div>

        {access.has('project:admin') &&
          <div className="box">
            <div className="box-header">
              <h3>{t('Revoke Key')}</h3>
            </div>
            <div className="box-content with-padding">
              <p>
                {t(
                  'Revoking this key will immediately remove and suspend the credentials. This action is irreversible.'
                )}
              </p>

              <fieldset className="form-actions">
                <a onClick={this.onRemove} className="btn btn-danger">
                  {t('Revoke Key')}
                </a>
              </fieldset>
            </div>
          </div>}

      </form>
    );
  }
});

export default React.createClass({
  mixins: [ApiMixin, OrganizationState],

  getInitialState() {
    return {
      loading: true,
      error: false,
      data: null
    };
  },

  componentDidMount() {
    this.fetchData();
  },

  fetchData() {
    let {keyId, orgId, projectId} = this.props.params;
    this.api.request(`/projects/${orgId}/${projectId}/keys/${keyId}/`, {
      success: (data, _, jqXHR) => {
        this.setState({
          error: false,
          loading: false,
          data: data
        });
      },
      error: () => {
        this.setState({
          error: true,
          loading: false
        });
      }
    });
  },

  handleRemove(data) {
    let {orgId, projectId} = this.props.params;
    browserHistory.push(null, `/${orgId}/${projectId}/settings/keys/`);
  },

  handleSave(data) {
    this.setState({data: {...this.state.data, ...data}});
  },

  renderLoading() {
    return (
      <div className="box">
        <LoadingIndicator />
      </div>
    );
  },

  render() {
    if (this.state.loading) return this.renderLoading();
    else if (this.state.error) return <LoadingError onRetry={this.fetchData} />;

    let {data} = this.state;
    let {orgId, projectId} = this.props.params;

    return (
      <div className="ref-key-details">
        <KeySettings
          access={this.getAccess()}
          orgId={orgId}
          projectId={projectId}
          initialData={{
            isActive: data.isActive,
            name: data.name
          }}
          data={data}
          onSave={this.handleSave}
          onRemove={this.handleRemove}
        />
      </div>
    );
  }
});
